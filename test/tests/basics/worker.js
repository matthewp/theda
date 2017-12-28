importScripts('../../../theda.umd.js');

class Counter {
  constructor() {
    this.count = 0;
  }

  increment(by = 1) {
    this.count += by;
    return this.count;
  }

  decrement(by = 1) {
    return this.increment(0 - by);
  }
}

theda.provide(Counter);
