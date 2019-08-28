const aws = require('aws-sdk');
const debug = require('debug');
const crypto = require('crypto');
const cuid = require('cuid');
const zlib = require('zlib');
const pick = require('lodash.pick');

const logDebug = debug('app:debug');
const logError = debug('app:error');

const DefaultSrvConfig = {
    defaultTitle: 'New entry',
    configKey: 'config.json',
    keyPrefix: 'data',
    nameTemplate: '$UNIQUE$',
    bucket: '',
    useCompression: false,
    passwd: '',
    salt: ''
};

const DefaultAppConfig = {
    code_hightlight: '0',
    autosave_timeout: '2000'
};

const FileProperties = ['id', 'size', 'lastModified', 'title', 'content'];

const s3 = new aws.S3();

const isNully = value => value === undefined || value === null;

// -----------------------
// Lame Web Token (lwt)
// -----------------------
class LWT {
    static sign(data, aiv) {
        const { algo, key, iv } = aiv;
        const cipher = crypto.createCipheriv(algo, key, iv);
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    }

    static verify(data, aiv) {
        const { algo, key, iv } = aiv;
        const decipher = crypto.createDecipheriv(algo, key, iv);
        let decrypted = decipher.update(data, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    }

    static aiv(hash, salt) {
        while (salt.length < 32) {
            salt += salt || cuid();
        }
        const $hash = Buffer.from(hash);
        const $salt = Buffer.from(salt);
        const key = Buffer.concat([$hash, $salt], 32);
        const iv = Buffer.concat([$salt, $hash], 16);
        return { algo: 'aes-256-cbc', key, iv };
    }
}

// -----------------------
// Auth error
// -----------------------
class AuthError extends Error {
    constructor() {
        super('Unauthorized');
        Error.captureStackTrace(this, this.constructor);
    }

    get code() {
        return 401;
    }
}

// -----------------------
// Generate file name
// -----------------------
const generateId = config => {
    const data = {
        timestamp: Date.now(),
        unique: cuid()
    };

    return config.nameTemplate.replace(
        /(\$([A-Z0-9-]+)\$)/g,
        (_1, _2, group2) => data[group2.toLowerCase()] || ''
    );
};

// -----------------------
// Utils
// -----------------------
const objectToPairs = object =>
    Object.keys(object).reduce((accum, key) => {
        accum.push({ name: key, value: object[key] });
        return accum;
    }, []);

const idToKey = (id, config) => `${config.keyPrefix}/${id}`;

const keyToId = (key, config) => key.replace(`${config.keyPrefix}/`, '');

// -----------------------
// Params
// -----------------------
const validateParams = (params, required) => {
    (required || ['Bucket', 'Key']).forEach(key => {
        const value = params[key];
        if (isNully(value) || !value.length) {
            throw new Error(`Missing required field '${key}' in S3 call`);
        }
    });
    return params;
};

// -----------------------
// Config
// -----------------------
function buildConfig() {
    let config = { ...DefaultSrvConfig };

    for (const key of Object.keys(config)) {
        const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
        config[key] = process.env[envKey] || config[key];
    }

    return config;
}

// -----------------------
// Compression
// -----------------------
function compress(data) {
    return zlib
        .deflateSync(typeof data === 'string' ? data : JSON.stringify(data))
        .toString('binary');
}

function decompress(data) {
    return zlib
        .inflateSync(
            typeof data === 'string'
                ? Buffer.from(data, 'binary')
                : Buffer.from(data)
        )
        .toString('utf8');
}

// -----------------------
// File / Object access
// -----------------------
async function getObjectInfo(bucket, key) {
    const head = await s3
        .headObject(
            validateParams({
                Bucket: bucket,
                Key: key
            })
        )
        .promise();

    const info = {
        key: key,
        size: head.ContentLength,
        lastModified: head.LastModified,
        title: decodeURIComponent(head.Metadata.title || '')
    };

    return info;
}

async function putObjectContent(bucket, key, content, metadata = {}) {
    // compress content
    const params = {
        Bucket: bucket,
        Key: key,
        ...(!isNully(content) && {
            Body: content
        }),
        ...(!isNully(metadata) && {
            Metadata: metadata
        })
    };

    if (!params.Body && !params.Metadata) {
        return {};
    }

    return await s3.putObject(validateParams(params)).promise();
}

async function getObjectContent(bucket, key) {
    const result = await s3
        .getObject(
            validateParams({
                Bucket: bucket,
                Key: key
            })
        )
        .promise();

    const content = result.Body.toString('utf8');
    const metadata = result.Metadata;

    return {
        size: result.ContentLength,
        lastModified: result.LastModified,
        title: decodeURIComponent(metadata.title || ''),
        content: Number(metadata.compressed || 0)
            ? decompress(content)
            : content
    };
}

// -----------------------
// File actions
// -----------------------
async function actionListFiles(data, headers, config) {
    const { bucket, keyPrefix: prefix } = config;

    const result = await s3
        .listObjectsV2(
            validateParams(
                {
                    Bucket: bucket,
                    Prefix: `${prefix}/`
                },
                ['Bucket', 'Prefix']
            )
        )
        .promise();

    const items = result.Contents;
    if (!items) {
        return [];
    }

    // Head files in batches
    const BATCH_SIZE = 5;
    const lastItemIndex = items.length - 1;
    const batches = items.reduce(
        (accum, file, index) => {
            const batch = accum[0];
            batch.push(file);
            if (batch.length > BATCH_SIZE && index < lastItemIndex) {
                accum.unshift([]);
            }
            return accum;
        },
        [[]]
    );

    let files = [];
    while (batches.length) {
        const batch = batches.pop();
        if (batch.length == 0) {
            continue;
        }

        const batchFiles = await Promise.all(
            batch.map(file => getObjectInfo(bucket, file.Key))
        );
        files = files.concat(
            batchFiles.map(file => ({
                ...pick(file, FileProperties),
                id: keyToId(file.key, config)
            }))
        );
    }

    return files.sort((file1, file2) =>
        file1.lastModified < file2.lastModified ? 1 : -1
    );
}

async function actionCreateFile(data, headers, config) {
    const { id = generateId(config), title = '', content = '' } = data;
    if (!id) {
        throw new Error('Missing required field: `id`');
    }

    const { bucket, useCompression } = config;
    const key = idToKey(id, config);

    await putObjectContent(
        bucket,
        key,
        useCompression ? compress(content) : content,
        {
            title: encodeURIComponent(title || config.defaultTitle),
            compressed: String(Number(Boolean(useCompression)))
        }
    );

    const file = await getObjectInfo(bucket, key);
    return {
        ...pick(file, FileProperties),
        id: keyToId(file.key, config)
    };
}

async function actionDeleteFile(data, headers, config) {
    const { id } = data;
    if (!id) {
        throw new Error('Missing required field: `id`');
    }

    const { bucket } = config;
    const key = idToKey(id, config);

    const file = await getObjectInfo(bucket, key);

    await s3
        .deleteObject({
            Bucket: bucket,
            Key: key
        })
        .promise();

    return {
        ...pick(file, FileProperties),
        id: keyToId(file.key, config)
    };
}

async function actionUpdateFile(data, headers, config) {
    const { id } = await actionCreateFile(data, headers, config);
    const file = await getObjectContent(config.bucket, idToKey(id, config));
    return {
        ...file,
        id
    };
}

async function actionGetFileContent(data, headers, config) {
    const { id } = data;
    if (!id) {
        throw new Error('Missing required key: `id`');
    }

    const file = await getObjectContent(config.bucket, idToKey(id, config));
    return {
        ...file,
        id
    };
}

// -----------------------
// Config actions
// -----------------------
async function getAppConfig(config) {
    const { bucket, configKey } = config;

    let content;
    try {
        const result = await s3
            .getObject(
                validateParams({
                    Bucket: bucket,
                    Key: configKey
                })
            )
            .promise();

        content = result.Body;
    } catch (err) {
        return {};
    }

    return !isNully(content) ? JSON.parse(content) : {};
}

function buildConfigResponse(configuration) {
    return objectToPairs({
        ...DefaultAppConfig,
        ...(configuration || {})
    });
}

async function actionSetConfig(data, headers, config) {
    const { fields } = data;
    if (!fields || !fields.length) {
        throw new Error('Missing properties to set');
    }

    let configuration = await getAppConfig(config);
    configuration = fields.reduce((configuration, field) => {
        const value = field.value;
        if (isNully(value)) {
            delete configuration[field.name];
        } else {
            configuration[field.name] = value;
        }
        return configuration;
    }, configuration);

    await s3
        .putObject(
            validateParams({
                Bucket: config.bucket,
                Key: config.configKey,
                Body: JSON.stringify(configuration)
            })
        )
        .promise();

    return buildConfigResponse(configuration);
}

async function actionGetConfig(data, headers, config) {
    const configuration = await getAppConfig(config);
    return buildConfigResponse(configuration);
}

// -----------------------
// User login
// -----------------------
async function actionSignIn(data, headers, config) {
    const authorized = data.passwd === config.passwd;
    if (!authorized) {
        throw new AuthError();
    }

    const lwt_data = {
        p: data.passwd,
        e: 1.8e7,
        t: Date.now()
    };

    const cert = LWT.aiv(config.passwd, config.salt);
    return LWT.sign(lwt_data, cert);
}

// -----------------------
// Auth middleware
// -----------------------
async function verify(headers, config) {
    try {
        const { token } = headers;
        if (!token) {
            return false;
        }

        const cert = LWT.aiv(config.passwd, config.salt);
        const data = LWT.verify(token, cert);
        return Date.now() < data.t + data.e;
    } catch (err) {
        return false;
    }
}

function auth(handler) {
    return async (data, headers, config) => {
        const authorized = await verify(headers, config);
        if (!authorized) {
            throw new AuthError();
        }

        return await handler(data, headers, config);
    };
}

// -----------------------
// Routing
// -----------------------
const actionHandlers = {
    signIn: actionSignIn,
    setConfig: auth(actionSetConfig),
    getConfig: auth(actionGetConfig),
    listFiles: auth(actionListFiles),
    createFile: auth(actionCreateFile),
    deleteFile: auth(actionDeleteFile),
    updateFile: auth(actionUpdateFile),
    getContent: auth(actionGetFileContent)
};

exports.handler = async event => {
    const { payload, headers = {} } = event;
    const { action, data = {} } = payload;

    logDebug(`Handle action '${action}'`);

    const config = buildConfig();

    try {
        const handler = actionHandlers[action];
        if (!handler) {
            throw new Error('Missing action handler');
        }

        return await handler(data, headers, config);
    } catch (error) {
        if (error instanceof AuthError) {
            logError(
                `Unauthorized access; action=${action}; headers=${JSON.stringify(
                    headers
                )}; data=${JSON.stringify(data)}`
            );
        } else {
            logError(error);
        }

        throw error;
    }
};
