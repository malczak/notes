const path = require('path');
const fs = require('fs');

const appDirectory = fs.realpathSync(process.cwd());

const resolvePath = relativePath => path.resolve(appDirectory, relativePath);

const resolveFirstExistingPath = (...relativePaths) => {
    for (const relativePath of relativePaths) {
        const absolutePath = resolvePath(relativePath);
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        }
    }
    return null;
};

module.exports = stage => {
    return {
        appDirectory,
        appBuild: resolvePath('build'),
        appPublic: resolvePath('public'),
        appHtml: resolveFirstExistingPath(
            `public/index-${stage}.html`,
            'public/index.html'
        ),
        appIndexJs: resolvePath('src/index.tsx'),
        appPackageJson: resolvePath('package.json'),
        appSrc: resolvePath('src'),
        commonSrc: resolvePath('../common/src'),
        assetsSrc: resolvePath('assets'),
        appNodeModules: resolvePath('node_modules'),
        appSSLKey: resolvePath('config/ssl/ssl_cert.key'),
        appSSLCert: resolvePath('config/ssl/ssl_cert.crt')
    };
};
