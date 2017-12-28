(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.theda = {})));
}(this, (function (exports) { 'use strict';

//      
// An event handler can take an optional event argument
// and should not return a value
                                          
// An array of all currently registered event handlers for a type
                                            
// A map of event types and their corresponding event handlers.
                        
                                   
  

/** Mitt: Tiny (~200b) functional event emitter / pubsub.
 *  @name mitt
 *  @returns {Mitt}
 */
function mitt(all                 ) {
	all = all || Object.create(null);

	return {
		/**
		 * Register an event handler for the given type.
		 *
		 * @param  {String} type	Type of event to listen for, or `"*"` for all events
		 * @param  {Function} handler Function to call in response to given event
		 * @memberOf mitt
		 */
		on: function on(type        , handler              ) {
			(all[type] || (all[type] = [])).push(handler);
		},

		/**
		 * Remove an event handler for the given type.
		 *
		 * @param  {String} type	Type of event to unregister `handler` from, or `"*"`
		 * @param  {Function} handler Handler function to remove
		 * @memberOf mitt
		 */
		off: function off(type        , handler              ) {
			if (all[type]) {
				all[type].splice(all[type].indexOf(handler) >>> 0, 1);
			}
		},

		/**
		 * Invoke all handlers for the given type.
		 * If present, `"*"` handlers are invoked after type-matched handlers.
		 *
		 * @param {String} type  The event type to invoke
		 * @param {Any} [evt]  Any value (object is recommended and powerful), passed to each handler
		 * @memberof mitt
		 */
		emit: function emit(type        , evt     ) {
			(all[type] || []).map(function (handler) { handler(evt); });
			(all['*'] || []).map(function (handler) { handler(type, evt); });
		}
	};
}

const spec = '_leni-tag';
const MSG = 1;
const DEL = 2;

let globalId = 0;

const emitterProto = Object.create(null);
emitterProto.post = function(type, data){
  this._worker.postMessage({
    spec, type, data,
    stype: MSG,
    id: this._id
  });
};
emitterProto.addEventListener = function(type, cb){
  this._emitter.on(type, cb);
};
emitterProto.removeEventListener = function(type, cb){
  this._emitter.off(type, cb);
};
emitterProto.emit = function(a, b){
  this._emitter.emit(a, b);
};
emitterProto.handleEvent = function(ev){
  let msg = ev.data || {};
  if(msg.spec === spec && msg.id === this._id) {
    this.emit(msg.type, msg.data);
  }
};
emitterProto.disconnect = function(){
  this._worker.postMessage({
    spec,
    stype: DEL,
    id: this._id
  });
};
emitterProto.stopListening = function(){
  this._all.reset();
  this.disconnect();
};

const eAll = Object.create(null);
eAll.reset = function(){
  for (let i in this) delete this[i];
};

function createEmitter(tag, worker, id) {
  let e = Object.create(emitterProto);
  e._tag = tag;
  if(id === undefined) {
    id = (globalId = globalId + 1);
  }
  e._id = id;
  e._worker = worker;
  e._all = Object.create(eAll);
  e._emitter = mitt(e._all);
  return e;
}

function connect$1(tag, worker) {
  let e = createEmitter(tag, worker);
  worker.addEventListener('message', e);
  return e;
}

function subscribe(tag, cb) {
  let idMap = new Map();

  self.addEventListener('message', function(ev){
    let msg = ev.data || {};
    if(msg.spec === spec) {
      switch(msg.stype) {
        case MSG:
          let emitter = idMap.get(msg.id);
          if(!emitter) {
            emitter = createEmitter(tag, self, msg.id);
            cb(emitter);
            idMap.set(msg.id, emitter);
          }
          emitter.emit(msg.type, msg.data);
          break;
        case DEL:
          idMap.delete(msg.id);
          break;
      }

    }
  });
}

const T_INSTANCE = Symbol('instance');

function connect$$1(worker) {
  let connectionMap = new Map();

  return new Proxy(Object.create(null), {
    get(target, key) {
      return proxyForConstructor(connectionMap, key, worker);
    }
  });
}

function disconnect(proxy) {
  let inst = Reflect.get(proxy, T_INSTANCE);
  let emitter = inst._emitter;
  emitter.disconnect();
}

function proxyForConstructor(map, name, worker) {
  if(map.has(name)) {
    return map.get(name);
  }

  let ctr = function(){};
  let proxy = new Proxy(ctr, {
    construct(target, argumentsList) {
      let emitter = connect$1(name, worker);
      return proxyForInstance(ctr, argumentsList, emitter);
    }
  });

  map.set(name, proxy);

  return proxy;
}

function proxyForInstance(Ctr, args, emitter) {
  let fnMap = new Map();
  let respMap = new Map();
  let inst = new Ctr();
  let proxy = new Proxy(inst, {
    get(target, key) {
      if(key === T_INSTANCE) {
        return inst;
      } else if(fnMap.has(key)) {
        return fnMap.get(key);
      }
      let fn = function(){};
      let fnProxy = new Proxy(fn, {
        apply(target, thisArg, argumentsList) {
          return callFunction(key, argumentsList);
        }
      });
      fnMap.set(key, fnProxy);
      return fnProxy;
    }
  });

  Object.defineProperty(inst, '_emitter', { value: emitter });

  let callId = 0;
  function callFunction(name, args) {
    let id = callId + 1;
    callId = id;

    let p = new Promise(function(resolve){
      respMap.set(id, resolve);
    });

    emitter.post('call', [id, name, args]);

    return p;
  }

  emitter.addEventListener('return', function([id, resp]){
    let resolve = respMap.get(id);
    resolve(resp);
  });

  emitter.post('construct', args);
  return proxy;
}

function provide(...args) {
  let Ctr, name;
  if(args.length === 1) {
    Ctr = args[0];
    name = Ctr.name;
  } else {
    Ctr = args[0];
    name = args[1];
  }

  subscribe(name, function(emitter){
    let inst;

    emitter.addEventListener('construct', function onConstruct(args) {
      emitter.removeEventListener('construct', onConstruct);
      inst = Reflect.construct(Ctr, args);
    });

    emitter.addEventListener('call', async function([id, method, args]){
      let p = inst[method].apply(inst, args);
      let resp = await p;
      emitter.post('return', [id, resp]);
    });
  });
}

exports.connect = connect$$1;
exports.disconnect = disconnect;
exports.provide = provide;

Object.defineProperty(exports, '__esModule', { value: true });

})));
