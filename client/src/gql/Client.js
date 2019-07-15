import url from 'url';
import aws4 from 'aws4';

const Consts = {
    service: 'appsync',
    hostSuffix: 'amazonaws.com',
    method: 'POST'
};

export class UnauthorizedError extends Error {
    constructor() {
        super();
        Error.captureStackTrace(this, this.constructor);
    }

    get code() {
        return 401;
    }
}

class Client {
    constructor({ endpoint, credentials }) {
        const { accessKeyId, secretAccessKey } = credentials;
        if (!accessKeyId || !secretAccessKey) {
            throw new Error('Missing IAM credentials');
        }

        const regex = new RegExp(
            `https://[^.]+.${Consts.service}-api.([^.]+).${Consts.hostSuffix}`,
            'gm'
        );
        const match = regex.exec(endpoint);

        if (!match) {
            throw new Error('Invalid AppSync GraphQL endpoint');
        }

        this.endpoint = endpoint;
        this.region = match[1];
        this.credentials = { accessKeyId, secretAccessKey };

        const url_info = url.parse(this.endpoint);
        this.hostname = url_info.host || url_info.hostname;
        this.host = `${url_info.protocol}//${url_info.host}`;
        this.path = url_info.path;
    }

    async query(query, variables = {}, headers = {}) {
        const request = this.createRequest(
            {
                variables,
                query
            },
            headers
        );

        return fetch(request).then(this.getResponseData);
    }

    async mutate(mutation, variables, headers) {
        return this.query(mutation, variables, headers);
    }

    createRequest(data, headers) {
        data = typeof data !== 'string' ? JSON.stringify(data) : data;

        const { token } = headers || {};
        const req = aws4.sign(
            {
                doNotModifyHeaders: true,
                host: this.host,
                path: this.path,
                region: this.region,
                service: Consts.service,
                method: Consts.method,
                headers: {
                    Host: this.hostname,
                    'Content-Type': 'application/json; charset=UTF-8',
                    Accept: 'application/json',
                    'X-Amz-Date': this.getDate(),
                    ...(token ? { token } : null)
                },
                body: data
            },
            {
                accessKeyId: this.credentials.accessKeyId,
                secretAccessKey: this.credentials.secretAccessKey
            }
        );

        const request = new Request(this.endpoint, {
            ...req,
            headers: new Headers(req.headers)
        });

        return request;
    }

    getDate() {
        return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    }

    getResponseData(response) {
        return response.json().then(json => {
            if (json.errors) {
                const errors = json.errors;
                const unauthorized = errors.find(
                    error => error.message === 'Unauthorized'
                );
                if (unauthorized) {
                    throw new UnauthorizedError();
                } else {
                    throw new Error(
                        errors.length ? errors[0].message : 'Internal'
                    );
                }
            }

            const { data } = json;
            if (data) {
                const keys = Object.keys(data);
                if (keys.length == 1) {
                    return data[keys[0]];
                } else {
                    return data;
                }
            }
            return json;
        });
    }
}

export default Client;
