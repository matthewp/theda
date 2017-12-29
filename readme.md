# theda

__theda__ makes moving state off of the main thread easy. Create classes in web worker and then use them within your main thread.

## The Problem

Most native platforms encourage using the main thread only for UI. On the web, however, we *only* had the main thread until just a few years ago. Even though web worker have been around for several years, they are not utilized by most applications.

As we have developed more sophisticated UI libraries that make it easier than ever to develop impressive applications we are putting even more pressure on the main UI thread. This leads to jank; something you've inevitably experience in apps you use on the web. Jank is an even bigger problem on mobile, where developers don't test as closely.

One of the big reasons why web workers are not used more is that its API is a bit clunky.

## The Solution

What if we could interact with state in a worker similar to how we interact with objects? __theda__ allows you to create objects in the main thread that are a *Proxy* for an object that actually exists in a worker.

The only rules are that you can only call functions and those functions return async. It looks like this:

```js
async function app() {
  let counter = new Counter();

  await counter.increment();

  let count = await counter.getCount();
}

app();
```

This makes it easier to move your component's business logic to a worker, and use the main thread for rendering your UI.

## Usage

Here's a fuller example that uses [lit-html](https://github.com/PolymerLabs/lit-html) for rendering the UI:

__index.html__

```html
<!doctype html>
<html lang="en">
<title>Counter example</title>

<my-counter></my-counter>

<script type="module" src="./app.js"></script>
```

__app.js__

```js
import { html, render } from '//unpkg.com/lit-html';
import { connect } from '//unpkg.com/theda';

const { Counter } = connect(new Worker('./worker.js'));

customElements.define('my-counter', class extends HTMLElement {
  constructor() {
    super();
    this.counter = new Counter();

    this.attachShadow({mode:'open'});
  }

  connectedCallback() {
    this.update();
    this.shadowRoot.addEventListener('click', this);
  }

  handleEvent(ev) {
    switch(ev.target.id) {
      case 'increment':
        this.increment();
        break;
      case 'decrement':
        this.decrement();
        break;
    }
  }

  async update() {
    let state = await this.counter.getState();
    render(this.render(state), this.shadowRoot);
  }

  render({count}) {
    return html`
      <div class="count">${count}</div>
      <div>
        <button id="increment" type="button">Increment</button>
        <button id="decrement" type="button">Decrement</button>
      </div>
    `;
  }

  increment() {
    this.counter.increment();
    this.update();
  }

  decrement() {
    this.counter.decrement();
    this.update();
  }
});
```

__worker.js__

```js
// Workers do not support modules yet :(
importScripts('https://unpkg.com/theda/theda.umd.js');

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
```

In the above example our main thread handles *events* and renders *dom*, the business logic of responding to events (and potentially doing side-effectual things like making API requests) takes place within the worker.

## License

BSD-2-Clause
