importScripts('../../theda.umd.js');

class Counter {
  constructor() {
    this.count = 0;
  }

  increment(by = 1) {
    this.count += by;
  }

  decrement(by = 1) {
    this.increment(0 - by);
  }

  getState() {
    return Object.assign({}, this);
  }
}

theda.provide(Counter);
