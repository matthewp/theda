import { html, render } from '//unpkg.com/lit-html';
import { connect } from '../../theda.js';

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
