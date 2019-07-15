const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { withLowercaseKeys, getPaths } = require('./utils');

const Const = {
    allowedExtensions: ['html', 'js', 'css'],
    contentTypes: {
        html: 'text/html',
        js: 'text/javascript',
        css: 'text/css'
    }
};

class ClientPlugin {
    constructor(serverless) {
        this.serverless = serverless;
        this.provider = this.serverless.getProvider('aws');

        this.hooks = {
            'after:deploy:deploy': this.process.bind(this)
        };
    }

    async process() {
        const stage = this.provider.getStage();
        if (!['prod', 'dev'].includes(stage)) {
            console.log(`🎬 Skipping client deployment; stage=${stage}`);
            return;
        }
        const region = this.provider.getRegion();

        const outputs = withLowercaseKeys(this.provider.outputs, [
            'User',
            'Bucket',
            'AccessKeyId',
            'SecretAccessKey',
            'ApiEndpoint',
            'ClientUrl'
        ]);

        if (!outputs) {
            throw new Error('Missing required stack outputs');
        }

        const serverConfig = {
            endpoint: outputs.apiEndpoint,
            bucket: outputs.bucket,
            user: outputs.user,
            region,
            stage,
            credentials: {
                accessKeyId: outputs.accessKeyId,
                secretAccessKey: outputs.secretAccessKey
            }
        };

        console.log('⚙️ Building client application');

        const paths = getPaths();
        const configJson = JSON.stringify({ server: serverConfig });

        // Compile client app
        execSync(
            `yarn build --env.stage=${stage} --env.config='${configJson}'`,
            { cwd: paths.clientDir }
        );

        const buildPath = path.resolve(
            paths.clientDir,
            'build',
            `env-${stage}`
        );

        const files = fs
            .readdirSync(buildPath)
            .map(file => {
                return {
                    name: file,
                    path: path.resolve(buildPath, file),
                    ext: (path.extname(file) || '').substring(1)
                };
            })
            .filter(file => Const.allowedExtensions.includes(file.ext));

        console.log('⬆️ Uploading client files');
        for (const file of files) {
            console.log(`   - ${file.name}`);
            const body = fs.readFileSync(file.path);
            await this.provider.request('S3', 'putObject', {
                Bucket: serverConfig.bucket,
                Key: file.name,
                Body: body,
                ContentType: Const.contentTypes[file.ext],
                ACL: 'public-read'
            });
        }

        console.log(`🌍 ${outputs.clientUrl}`);
    }
}

module.exports = ClientPlugin;
