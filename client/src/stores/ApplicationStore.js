// Core
import { observable, action } from 'mobx';

// Stores
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

class ApplicationStore {
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
        console.warn(
            `**\nVersion ${GIT_BRANCH} #${GIT_COMMIT} @ ${BUILD_DATE} \n**`
        );

        this.appSync = new AppSyncStore();
    }

    deleteFile(file) {
        if (confirm('Are you sure you want to permanently delete memo?')) {
            this.appSync.deleteFile(file);
        }
    }

    toObject() {
        return {
            rootStore: this,
            appSync: this.appSync
        };
    }
}

export default ApplicationStore;
