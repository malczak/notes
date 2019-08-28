const cuid = require('cuid');
const glob = require('glob');
const path = require('path');

const readFiles = (pattern, cwd, ignore = []) =>
    glob.sync(pattern, {
        cwd,
        stat: true,
        nocase: true,
        nodir: true,
        follow: false,
        ignore
    });

const getStackName = serverless => {
    const aws = serverless.getProvider('aws');
    return `${serverless.service.getServiceName()}-${aws.getStage()}`;
};

const fetchStackInfo = async serverless => {
    const aws = serverless.getProvider('aws');
    const {
        Stacks: [Stack]
    } = await aws.request('CloudFormation', 'describeStacks', {
        StackName: getStackName(serverless)
    });
    return Stack;
};

const withLowercaseKeys = (object, keys) => {
    if (!object) {
        return null;
    }

    return Object.keys(object)
        .filter(key => keys.includes(key))
        .reduce((accum, key) => {
            const lowercase = key[0].toLowerCase() + key.substring(1);
            accum[lowercase] = object[key];
            return accum;
        }, {});
};

const getPaths = () => {
    const baseDir = path.resolve(__dirname, '..');
    const serverDir = path.resolve(baseDir, 'server');
    const clientDir = path.resolve(baseDir, 'client');
    return {
        baseDir,
        serverDir,
        clientDir
    };
};

const generateUniqueSalt = () => cuid();

module.exports = {
    readFiles,
    getStackName,
    fetchStackInfo,
    withLowercaseKeys,
    getPaths,
    generateUniqueSalt
};
