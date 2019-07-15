import { reaction } from 'mobx';

import Store from 'app/stores/Store';
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

class Config {
    constructor(config) {
        this.$config = config || {};
    }

    getValue(name, defaultValue = null) {
        return this.$config[name || ''] || defaultValue;
    }
}

class AppSyncStore extends Store {
    @observable.ref token = null;

    @observable.ref config = Loadable.empty();

    @observable.shallow files = null;

    @computed
    get authorized() {
        return this.token && this.token.length > 0;
    }

    @computed
    get isReady() {
        return this.authorized && this.config.isReady;
    }

    @action
    $setConfig(config) {
        this.config = config;
    }

    @action
    $setToken(token) {
        this.token = token;
    }

    init() {
        super.init();

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

    async signIn(passwd) {
        return this.$query(QuerySignIn, { passwd }).then(token => {
            this.$setToken(token);
        });
    }

    fetchConfig() {
        this.config = Loadable.loading();

        this.$query(QueryGetConfig)
            .then(data => {
                this.$setConfig(Loadable.available(new Config(data)));
            })
            .catch(error => {
                this.$setConfig(Loadable.error(error));
            });
    }

    async fetchMemos() {
        // don't fetch if aready done once
        if (this.files) {
            return Promise.resolve(this.files);
        }

        return this.$query(QueryAllFiles).then(files => {
            this.appendFiles(files, 'push');
        });
    }

    async fetchMemo(id) {
        return this.$query(QueryContent, { id }).then(file => {
            return file;
        });
    }

    async createFile() {
        return this.$mutate(MutationCreateFile, {}).then(file => {
            this.appendFiles([file], 'unshift');
            return file;
        });
    }

    async saveFile(file) {
        return this.$mutate(MutationContent, file).then(file => {
            this.updateFile(file);
            return file;
        });
    }

    async deleteFile(file) {
        return this.$mutate(MutationDeleteFile, { id: file.id }).then(file => {
            this.removeFiles([file]);
            return true;
        });
    }

    @action
    appendFiles(files = [], action) {
        if (!this.files) {
            this.files = [];
        }

        this.files[action](...files);

        this.softFiles();
    }

    @action
    removeFiles(files = []) {
        if (!this.files) {
            return;
        }

        let modified = false;
        for (const file of files) {
            const { id } = file;
            const cacheIndex = this.files.findIndex(file => file.id == id);
            if (cacheIndex != -1) {
                this.files.remove(this.files[cacheIndex]);
                modified = true;
            }
        }

        if (modified) {
            this.softFiles();
        }
    }

    @action
    updateFile(file) {
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
        const headers = {};
        if (this.authorized) {
            headers['token'] = this.token;
        }
        return headers;
    }

    $query(query, variables = {}) {
        return this.$catchUnauthorized(
            this.client.query(query, variables, this.$getHeaders())
        );
    }

    $mutate(mutation, variables) {
        return this.$catchUnauthorized(
            this.client.mutate(mutation, variables, this.$getHeaders())
        );
    }

    $catchUnauthorized(req) {
        return req.catch(error => {
            if (error instanceof UnauthorizedError) {
                this.$setToken(null);
            }
            throw error;
        });
    }
}

export default AppSyncStore;
