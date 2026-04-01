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
    return new Proxy(
      { data: state },
      {
        get: (target, prop: keyof TState) => {
          return target.data[prop];
        },
        set: (
          target,
          prop: keyof TState | 'data',
          newValue: TState[keyof TState] | Partial<TState>,
        ) => {
          if (prop === 'data') {
            target.data = {
              ...target.data,
              ...(newValue as Partial<TState>),
            };
            this.updateUI();
          } else if (target.data[prop] !== newValue) {
            target.data[prop] = newValue as TState[keyof TState];
            this.updateUI();
          }

          return true;
        },
      },
    ) as unknown as TState;
  }

  protected updateState(state: Partial<TState>) {
    const wrapper = this.state as unknown as { data: TState };
    wrapper.data = { ...wrapper.data, ...state };
  }

  protected abstract updateUI(): void;
}

export default BaseComponent;
