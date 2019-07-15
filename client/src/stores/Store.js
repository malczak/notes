import EventEmitter from 'events';

export default class Store extends EventEmitter {
    //

    _stores = {};

    constructor(store, parent) {
        super();

        this.store = store || this;
        this.parent = parent || this;

        this._storeIsRoot = this.store === this;

        if (this._storeIsRoot) {
            global.store = this;
        }
    }

    // ========================
    // Public Methods
    // ========================
    registerStore(name, StoreClass) {
        if (typeof StoreClass !== 'function') {
            return this;
        }

        this[name] = new StoreClass(this.store, this);
        this._stores[name] = true;
        return this;
    }

    unregisterStore(name) {
        delete this[name];
        delete this._stores[name];
        return this;
    }

    initialize() {
        this.init();
        for (let key in this._stores) {
            callFn(this[key], 'initialize');
        }
        return this;
    }

    dispose() {
        for (let key in this._stores) {
            callFn(this[key], 'dispose');
        }
        this.destroy();
        return this;
    }

    // ========================
    // Virtual Methods
    // ========================

    init() {}

    destroy() {}
}

function callFn(object, fnName) {
    if (typeof object[fnName] === 'function') {
        return object[fnName]();
    }
}
