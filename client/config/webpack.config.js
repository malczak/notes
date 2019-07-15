// Core
const webpack = require('webpack');
const { execSync } = require('child_process');
const path = require('path');

// Plugins
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

// Git Info
const gitCommit = execSync('git log --format="%H" -n 1')
    .toString()
    .replace(/\s+/g, '');
const gitBranch = execSync('git rev-parse --abbrev-ref HEAD')
    .toString()
    .replace(/\s+/g, '');

// Webpack Plugins
const WebpackBuildNotifierPlugin = require('webpack-build-notifier');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
    .BundleAnalyzerPlugin;

// Api consts
const endpoints = {
    local: {
        webpack: 'local',
        config: {
            env: 'local',
            server: require('./.config.json')
        }
    },
    prod: {
        webpack: 'prod',
        config: {
            env: 'prod'
        }
    }
};

const commonConfig = {};

const babelLoader = {
    loader: 'babel-loader',
    options: {
        sourceType: 'unambiguous',
        presets: ['@babel/preset-env', '@babel/preset-react'],
        plugins: [
            [
                '@babel/plugin-proposal-decorators',
                {
                    legacy: true
                }
            ],
            [
                '@babel/plugin-proposal-class-properties',
                {
                    loose: true
                }
            ],
            [
                '@babel/plugin-transform-runtime',
                {
                    helpers: true
                }
            ]
        ]
    }
};

module.exports = function(env = {}) {
    const stage = Array.isArray(env.stage) ? env.stage.pop() : env.stage;
    const paths = require('./paths')(stage);
    const stageConfig = endpoints[stage || 'local'];
    const clientConfig = Object.assign(
        commonConfig,
        stageConfig.config || {},
        JSON.parse(env.config || '{}')
    );
    const packageJson = require(paths.appPackageJson);

    console.log(
        `Building for '${stage}': \n${JSON.stringify(stageConfig, null, 2)}`
    );

    let webpackConfig = {
        entry: {
            app: paths.appIndexJs
        },
        output: {
            crossOriginLoading: 'anonymous'
        },
        resolve: {
            extensions: ['.js', '.jsx', '.json'],
            alias: {
                app: paths.appSrc,
                common: paths.commonSrc,
                assets: paths.assetsSrc
            },
            modules: [paths.appNodeModules],
            symlinks: false
        },
        target: 'web',
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /node_modules(?!\/webpack-dev-server)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            ...babelLoader.options,
                            env: {
                                development: {
                                    plugins: ['react-hot-loader/babel']
                                }
                            }
                        }
                    }
                },
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                modules: false,
                                sourceMap: true
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
                                importLoaders: 1
                            }
                        },
                        {
                            loader: 'less-loader'
                        }
                    ]
                },
                {
                    test: /\.svg$/,
                    use: [
                        babelLoader,
                        {
                            loader: 'react-svg-loader'
                        }
                    ]
                },
                {
                    test: /\.(png|jpg|gif|eot|woff|woff2|ttf|mp4|mp3|cur|)$/,
                    use: [
                        {
                            loader: 'file-loader',
                            options: {
                                limit: 4096,
                                name:
                                    'assets/[name]-[sha512:hash:base64:7].[ext]'
                            }
                        }
                    ]
                },
                {
                    test: /\.mjs$/,
                    include: /node_modules/,
                    type: 'javascript/auto'
                }
            ]
        },
        node: {
            fs: 'empty',
            tls: 'empty'
        },
        plugins: [
            new CopyPlugin([
                {
                    from: path.resolve(paths.appPublic, '*.*'),
                    to: path.resolve(paths.appBuild, `env-${stage}`)
                }
            ]),
            new HtmlWebpackPlugin({
                template: paths.appHtml,
                inject: true,
                title: 'Notes'
            }),
            new webpack.DefinePlugin({
                Env: {
                    config: JSON.stringify(clientConfig)
                },
                'process.env': {
                    BROWSER: JSON.stringify(true)
                }
            }),
            new webpack.ProvidePlugin({
                inject: ['mobx-react', 'inject'],
                observer: ['mobx-react', 'observer'],
                observable: ['mobx', 'observable'],
                action: ['mobx', 'action'],
                computed: ['mobx', 'computed'],
                React: 'react'
            }),
            new webpack.DefinePlugin({
                BUILD_TAG: JSON.stringify(env.tag || gitBranch),
                BUILD_DATE: JSON.stringify(new Date().toUTCString()),

                GIT_COMMIT: JSON.stringify(gitCommit),
                GIT_BRANCH: JSON.stringify(gitBranch)
            }),
            new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
            new MiniCssExtractPlugin({ filename: '[name].css' }),
            new WebpackBuildNotifierPlugin({
                title: `${packageJson.name} @ ${stage}`
            })
        ]
    };

    // Display bundle analyzer
    if (Boolean(env.analyzeBundle || stageConfig.analyze) === true) {
        webpackConfig.plugins.push(new BundleAnalyzerPlugin());
    }

    // run stage specific config
    const stageWebpackBuilder = require(`./webpack.config.${
        stageConfig.webpack
    }`);

    webpackConfig = stageWebpackBuilder(webpackConfig, {
        ...env,
        stage,
        paths,
        stageConfig,
        clientConfig
    });

    return webpackConfig;
};
