import { action, computed, observable, reaction } from 'mobx';

import Client, { UnauthorizedError } from 'app/gql/Client';
import Loadable from 'app/views/Loadable';

// Queries
import QueryAllFiles from 'app/gql/QueryAllFiles';
import QueryContent from 'app/gql/QueryContent';
import QueryGetConfig from 'app/gql/QueryGetConfig';
import QuerySignIn from 'app/gql/QuerySignIn';
import MutationContent from 'app/gql/MutationContent';
import MutationDeleteFile from 'app/gql/MutationDeleteFile';
import MutationCreateFile from 'app/gql/MutationCreateFile';

// Types
import { File } from 'app/gql/types';

declare module Env {
  export const config: any;
}

class Config {
  private $config: { [key: string]: string };

  constructor(config: { [key: string]: string }) {
    this.$config = config || {};
  }

  getValue(name: string, defaultValue: string = null) {
    return this.$config[name || ''] || defaultValue;
  }
}

export class AppSyncStore {
  @observable.ref
  token: string = null;

  @observable.ref
  config: Loadable<Config> = Loadable.empty();

  @observable.shallow
  files: File[] = null;

  client: Client;

  @computed
  get authorized() {
    return this.token && this.token.length > 0;
  }

  @computed
  get isReady() {
    return this.authorized && this.config.isReady;
  }

  @action
  $setConfig(config: Loadable<Config>) {
    this.config = config;
  }

  @action
  $setToken(token: string) {
    this.token = token;
  }

  constructor() {
    const server = Env.config.server;
    this.client = new Client({
      endpoint: server.endpoint,
      credentials: server.credentials
    });

    reaction(
      () => this.authorized,
      authorized => authorized && this.fetchConfig(),
      {
        fireImmediately: true
      }
    );
  }

  async signIn(passwd: string) {
    return this.$query<string>(QuerySignIn, { passwd }).then(token => {
      this.$setToken(token);
    });
  }

  fetchConfig() {
    this.config = Loadable.loading();

    this.$query(QueryGetConfig)
      .then((data: any) => {
        this.$setConfig(Loadable.available(new Config(data)));
      })
      .catch((error: Error) => {
        this.$setConfig(Loadable.error(error));
      });
  }

  async fetchMemos() {
    // don't fetch if aready done once
    if (this.files) {
      return Promise.resolve(this.files);
    }

    return this.$query<File[]>(QueryAllFiles).then(files => {
      this.appendFiles(files, 'push');
    });
  }

  async fetchMemo(id: string) {
    return this.$query<File>(QueryContent, { id }).then(file => {
      return file;
    });
  }

  async createFile() {
    return this.$mutate<File>(MutationCreateFile, {}).then(file => {
      this.appendFiles([file], 'unshift');
      return file;
    });
  }

  async saveFile(file: File) {
    return this.$mutate<File>(MutationContent, file).then(file => {
      this.updateFile(file);
      return file;
    });
  }

  async deleteFile(file: File) {
    return this.$mutate<File>(MutationDeleteFile, { id: file.id }).then(
      file => {
        this.removeFiles([file]);
        return true;
      }
    );
  }

  @action
  appendFiles(files: File[] = [], action: 'push' | 'unshift') {
    if (!this.files) {
      this.files = [];
    }

    (this.files as any)[action](...files);

    this.softFiles();
  }

  @action
  removeFiles(files: File[] = []) {
    if (!this.files) {
      return;
    }

    let modified = false;
    for (const file of files) {
      const { id } = file;
      const cacheIndex = this.files.findIndex(file => file.id == id);
      if (cacheIndex != -1) {
        //@ts-ignore
        this.files.remove(this.files[cacheIndex]);
        modified = true;
      }
    }

    if (modified) {
      this.softFiles();
    }
  }

  @action
  updateFile(file: File) {
    if (!this.files) {
      return;
    }

    const { id } = file;
    const cacheIndex = this.files.findIndex(file => file.id == id);
    if (cacheIndex != -1) {
      const cachedFile = this.files[cacheIndex];
      this.files[cacheIndex] = {
        ...cachedFile,
        title: file.title,
        lastModified: file.lastModified
      };

      this.softFiles();
    }
  }

  @action
  softFiles() {
    this.files = this.files.slice().sort((file1, file2) => {
      return file1.lastModified > file2.lastModified ? -1 : 1;
    });
  }

  $getHeaders() {
    const headers: { [header: string]: string } = {};
    if (this.authorized) {
      headers['token'] = this.token;
    }
    return headers;
  }

  $query<T>(query: string, variables: any = {}): Promise<T> {
    return this.$catchUnauthorized(
      this.client.query(query, variables, this.$getHeaders())
    );
  }

  $mutate<T>(mutation: string, variables: any): Promise<T> {
    return this.$catchUnauthorized(
      this.client.mutate(mutation, variables, this.$getHeaders())
    );
  }

  $catchUnauthorized<T>(req: Promise<T>): Promise<T> {
    return req.catch((error: Error) => {
      if (error instanceof UnauthorizedError) {
        this.$setToken(null);
      }
      throw error;
    });
  }
}
