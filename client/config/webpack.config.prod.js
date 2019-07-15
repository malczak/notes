// Core
const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');

// Webpack Utils
const autoprefixer = require('autoprefixer');

// Webpack Plugins
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const UglifyJsWebpackPlugin = require('uglifyjs-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// Settings
const settings = {
    browsers: ['last 2 versions', 'ie > 11']
};

module.exports = function(commonConfig, opts = {}) {
    const { stage, paths } = opts;

    const webpackConfig = merge.smart(commonConfig, {
        mode: 'production',
        devtool: 'source-map',
        stats: {
            colors: false,
            hash: true,
            timings: true,
            assets: true,
            chunks: true,
            chunkModules: true,
            modules: true,
            children: true
        },
        optimization: {
            runtimeChunk: false,
            splitChunks: require('./splitChunks'),
            minimizer: [
                new UglifyJsWebpackPlugin({
                    cache: true,
                    parallel: true,
                    sourceMap: true
                }),
                new OptimizeCSSAssetsPlugin({
                    cssProcessorOptions: {
                        preset: [
                            'advanced',
                            {
                                autoprefixer: {
                                    browsers: settings.browsers
                                },
                                zindex: false,
                                mergeIdents: false,
                                reduceIdents: false,
                                discardUnused: false
                            }
                        ]
                    },
                    canPrint: true
                })
            ]
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                modules: true,
                                sourceMap: true,
                                importLoaders: 2
                            }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                sourceMap: true,
                                plugins: [
                                    autoprefixer({
                                        browsers: settings.browsers
                                    })
                                ]
                            }
                        }
                    ]
                },
                {
                    test: /\.less$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                modules: true,
                                sourceMap: true,
                                importLoaders: 2
                            }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                sourceMap: true,
                                plugins: [
                                    autoprefixer({
                                        browsers: settings.browsers
                                    })
                                ]
                            }
                        },
                        {
                            loader: 'less-loader'
                        }
                    ]
                }
            ]
        },
        plugins: [
            new webpack.NamedModulesPlugin(),
            new webpack.NamedChunksPlugin(),
            new CleanWebpackPlugin({ root: process.cwd() }),
            new webpack.NoEmitOnErrorsPlugin(),
            new webpack.optimize.ModuleConcatenationPlugin(),
            new webpack.EnvironmentPlugin({ NODE_ENV: 'production' }),
            new MiniCssExtractPlugin({ filename: '[name].css' })
        ],
        output: {
            path: path.resolve(paths.appBuild, `env-${stage}`),
            filename: '[name].[chunkhash].js'
        }
    });

    return webpackConfig;
};
