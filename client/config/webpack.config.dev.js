// Core
const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');

// Plugins
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = function(commonConfig, opts = {}) {
    const { stage, paths } = opts;

    const webpackConfig = merge.smart(commonConfig, {
        mode: 'development',
        optimization: {
            minimize: false,
            runtimeChunk: false,
            splitChunks: require('./splitChunks')
        },
        devtool: 'source-map',
        plugins: [
            new webpack.NamedModulesPlugin(),
            new webpack.NamedChunksPlugin(),
            new CleanWebpackPlugin({ root: process.cwd() }),
            new webpack.EnvironmentPlugin({ NODE_ENV: 'development' })
        ],
        output: {
            path: path.resolve(paths.appBuild, `env-${stage}`),
            filename: '[name].[chunkhash].js'
        }
    });

    return webpackConfig;
};
