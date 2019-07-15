export class LoadableProgress {
    static indeterminate() {
        return new LoadableProgress();
    }

    static value(value) {
        return new LoadableProgress(value);
    }
}

const LoadableState = {
    empty: 'empty',
    loading: 'loading',
    error: 'error',
    available: 'available'
};

class Loadable {
    static get State() {
        return LoadableState;
    }

    state = Loadable.State.empty;

    value = null;

    constructor(value, state = null) {
        this.value = value;
        this.state = state || Loadable.stateFromValue(value);
    }

    get isEmpty() {
        return this.state == Loadable.State.empty;
    }

    get isLoading() {
        return this.state == Loadable.State.loading;
    }

    get isReady() {
        return this.state == Loadable.State.available;
    }

    get isAvailable() {
        return this.isReady;
    }

    get hasError() {
        return this.state == Loadable.State.error;
    }

    get isInvalid() {
        return this.hasError;
    }

    static empty() {
        return new Loadable(null, Loadable.State.empty);
    }

    static loading(progress = null) {
        return new Loadable(
            progress ? progress : LoadableProgress.indeterminate(),
            Loadable.State.loading
        );
    }

    static error(error) {
        return new Loadable(error, Loadable.State.error);
    }

    static available(value) {
        return new Loadable(value, Loadable.State.available);
    }

    static stateFromValue(value) {
        if (value) {
            if (value instanceof LoadableProgress) {
                return Loadable.State.progress;
            }

            if (value instanceof Error) {
                return Loadable.State.error;
            }

            return Loadable.State.available;
        } else {
            return Loadable.State.empty;
        }
    }
}

export default Loadable;
