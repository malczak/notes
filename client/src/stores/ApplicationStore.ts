// Core
import { observable, action } from 'mobx';

// Stores
import { AppSyncStore } from 'app/stores/AppSyncStore';
import { File } from 'app/gql/types';

export type StoreProps = {
  rootStore?: ApplicationStore;
  appSync?: AppSyncStore;
};

export class ApplicationStore {
  @observable
  busy: boolean = false;

  appSync: AppSyncStore;

  @action
  setBusy(value: boolean) {
    this.busy = value;
  }

  constructor() {
    const version = (process.env.version as any) || {};
    console.warn(
      `**\nVersion ${version.GIT_BRANCH} #${version.GIT_COMMIT} @ ${version.BUILD_DATE} \n**`
    );

    this.appSync = new AppSyncStore();
  }

  deleteFile(file: File) {
    return new Promise((resolve, reject) => {
      if (confirm('Are you sure you want to permanently delete memo?')) {
        this.appSync
          .deleteFile(file)
          .then(resolve)
          .catch(reject);
      } else {
        reject(false);
      }
    });
  }

  toObject() {
    return {
      rootStore: this,
      appSync: this.appSync
    };
  }
}
