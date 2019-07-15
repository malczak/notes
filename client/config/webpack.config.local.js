// Core
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');

const HOST = 'notes.test';

module.exports = function(commonConfig, opts = {}) {
    const { paths } = opts;

    const inDocker = (opts.runner || '') === 'docker';
    const runnerOpts = inDocker
        ? {
              host: '0.0.0.0',
              disableHostCheck: true,
              open: false
          }
        : {
              host: HOST,
              disableHostCheck: true,
              open: true
          };

    const splitChunks = opts.splitChunks
        ? {
              splitChunks: require('./splitChunks')
          }
        : {};

    const webpackConfig = merge.smart(commonConfig, {
        mode: 'development',
        optimization: Object.assign(
            {
                minimize: false
            },
            splitChunks
        ),
        output: {
            path: path.join(paths.appBuild, 'dev'),
            filename: '[name].js',
            publicPath: '/'
        },
        devtool: 'source-map',
        devServer: Object.assign(
            {
                port: 9000,
                compress: true,
                historyApiFallback: true,
                hot: true,
                contentBase: paths.appDirectory,
                https: {
                    key: fs.readFileSync(paths.appSSLKey),
                    cert: fs.readFileSync(paths.appSSLCert)
                }
            },
            runnerOpts
        ),
        plugins: [new webpack.EnvironmentPlugin({ NODE_ENV: 'development' })]
    });

    return webpackConfig;
};
