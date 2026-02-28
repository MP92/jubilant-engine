export type BaseState = Record<string | symbol, unknown>;

abstract class BaseComponent<TState extends BaseState> {
  protected state: TState;

  protected constructor(
    protected readonly rootEl: HTMLElement,
    initialState: TState,
  ) {
    if (this.constructor === BaseComponent) {
      throw new Error('Cannot instantiate the abstract class BaseComponent.');
    }

    this.state = this.createProxyState(initialState);
  }

  private createProxyState(state: TState): TState {
    return new Proxy(state, {
      get: (target, prop: keyof TState) => {
        return target[prop];
      },
      set: (target, prop: keyof TState, newValue: TState[keyof TState]) => {
        if (target[prop] !== newValue) {
          target[prop] = newValue;

          this.updateUI();
        }

        return true;
      },
    });
  }

  protected querySelector<T extends HTMLElement = HTMLElement>(
    selector: string,
  ) {
    const element = this.rootEl.querySelector<T>(selector);

    if (!element) {
      throw Error(`${this.constructor.name}: ${selector} element not found.`);
    }

    return element;
  }

  protected querySelectorAll<T extends HTMLElement = HTMLElement>(
    selector: string,
  ) {
    const elements = this.rootEl.querySelectorAll<T>(selector);

    if (!elements.length) {
      throw Error(`${this.constructor.name}: ${selector} elements not found.`);
    }

    return [...elements];
  }

  protected abstract updateUI(): void;
}

export default BaseComponent;
