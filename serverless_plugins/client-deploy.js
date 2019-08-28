const cuid = require('cuid');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { readFiles, withLowercaseKeys, getPaths } = require('./utils');

const Const = {
    allowedExtensions: ['html', 'js', 'css', 'png'],
    contentTypes: {
        html: 'text/html',
        js: 'text/javascript',
        css: 'text/css',
        png: 'image/png'
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

        const files = readFiles(
            `**/*(${Const.allowedExtensions.map(ext => `*.${ext}`).join('|')})`,
            buildPath
        )
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

        console.log('⬆️ Uploading sample document');
        const sampleDoc = this.createSampleFile();
        await this.provider.request('S3', 'putObject', {
            Bucket: serverConfig.bucket,
            Key: `data/${sampleDoc.id}`,
            Body: sampleDoc.content,
            ACL: 'public-read',
            Metadata: {
                title: encodeURIComponent(sampleDoc.title),
                compressed: '0'
            }
        });

        console.log(`🌍 ${outputs.clientUrl}`);
    }

    createSampleFile() {
        return {
            id: cuid(),
            title: 'Your first entry',
            content: JSON.stringify({
                editor: 'quill',
                ops: [
                    { insert: 'Hi there!' },
                    {
                        attributes: { align: 'center', header: 2 },
                        insert: '\n'
                    },
                    { attributes: { align: 'center' }, insert: '\n' },
                    { insert: { divider: true } },
                    { insert: 'This is your private diary... ' },
                    {
                        attributes: { align: 'center', header: 3 },
                        insert: '\n'
                    },
                    { insert: 'make most of it!' },
                    {
                        attributes: { align: 'center', header: 3 },
                        insert: '\n'
                    },
                    { attributes: { align: 'center' }, insert: '\n' },
                    { attributes: { italic: true }, insert: 'good luck ' },
                    { attributes: { align: 'center' }, insert: '\n' },
                    { insert: 'Matt' },
                    { attributes: { align: 'center' }, insert: '\n' },
                    { insert: '\n' }
                ]
            })
        };
    }
}

module.exports = ClientPlugin;
