// Core
import { observable, action } from 'mobx';

// Stores
import Store from 'app/stores/Store';
import AppSyncStore from 'app/stores/AppSyncStore';

function reduce(object, source = null) {
    return Object.keys(object).reduce((accum, name) => {
        const store = (source || object)[name];
        if (typeof store == 'object') {
            accum[name] = store;
        }
        return accum;
    }, {});
}

class ApplicationStore extends Store {
    @observable
    busy = false;

    @action
    setBusy(value) {
        this.busy = value;
    }

    @action
    setShowCheckout(value) {
        this.showCheckout = value;
    }

    constructor() {
        super();

        console.warn(
            `**\nVersion ${GIT_BRANCH} #${GIT_COMMIT} @ ${BUILD_DATE} \n**`
        );

        this.registerStore('appSync', AppSyncStore);
    }

    deleteFile(file) {
        if (confirm('Are you sure you want to permanently delete memo?')) {
            this.appSync.deleteFile(file);
        }
    }

    toObject() {
        return {
            rootStore: this,
            ...reduce(this._stores, this)
        };
    }
}

export default ApplicationStore;
