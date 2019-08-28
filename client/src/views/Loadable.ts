export class LoadableProgress {
  value: number;

  constructor(value?: number) {
    this.value = value;
  }

  static indeterminate() {
    return new LoadableProgress();
  }

  static value(value: number) {
    return new LoadableProgress(value);
  }
}

export const enum LoadableState {
  empty = 'empty',
  loading = 'loading',
  error = 'error',
  available = 'available'
}

export class Loadable<T> {
  state: LoadableState = LoadableState.empty;

  value: T = null;

  constructor(state: LoadableState);
  constructor(value: T, state: LoadableState);
  constructor(error: Error, state: LoadableState);
  constructor(progress: LoadableProgress, state: LoadableState);
  constructor(value: any, state?: any) {
    if (arguments.length == 2) {
      this.value = <T>value;
      this.state = <LoadableState>state;
    } else {
      this.state = <LoadableState>value;
    }
  }

  get isEmpty() {
    return this.state == LoadableState.empty;
  }

  get isLoading() {
    return this.state == LoadableState.loading;
  }

  get isReady() {
    return this.state == LoadableState.available;
  }

  get isAvailable() {
    return this.isReady;
  }

  get hasError() {
    return this.state == LoadableState.error;
  }

  get isInvalid() {
    return this.hasError;
  }

  static empty<T>() {
    return new Loadable<T>(null, LoadableState.empty);
  }

  static loading<T>(progress: number = null) {
    return new Loadable<T>(
      new LoadableProgress(progress),
      LoadableState.loading
    );
  }

  static error<T>(error: Error) {
    return new Loadable<T>(error, LoadableState.error);
  }

  static available<T>(value: T) {
    return new Loadable<T>(value, LoadableState.available);
  }
}

export default Loadable;
