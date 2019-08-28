const path = require('path');
const glob = require('glob');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const { readFiles, getPaths } = require('./utils');

class PackagerPlugin {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;
        this.hooks = {
            'package:initialize': this.createArtifact.bind(this)
        };
    }

    async createArtifact() {
        const paths = getPaths();
        const slsDir = path.resolve(paths.baseDir, '.serverless');

        console.log('Building artifacts 🧙');
        if (this.options.disablePackager === true) {
            console.log('Skipping due to options');
            return;
        }

        const sources = readFiles('**/*(*.json|*.js)', paths.serverDir, [
            'node_modules/**/*.*',
            '**/package-lock.json'
        ]);

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-'));
        const cwd = { cwd: tmpDir };
        for (const file of sources) {
            fs.copyFileSync(
                path.resolve(paths.serverDir, file),
                path.resolve(tmpDir, file)
            );
        }

        execSync('npm i --production', cwd);

        execSync('chmod -R 755 .', cwd);

        execSync(`zip -qrX ${path.resolve(slsDir, 'artifact.zip')} .`, cwd);
    }
}

module.exports = PackagerPlugin;
