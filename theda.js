import {
  connect as eventConnect,
  subscribe
} from 'https://unpkg.com/leni@1.2.0/leni.js';

const T_INSTANCE = Symbol('instance');

function connect(worker) {
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
      let emitter = eventConnect(name, worker);
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

export { connect, disconnect, provide }
