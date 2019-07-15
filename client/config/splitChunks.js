// Shared split chunks config
module.exports = {
    cacheGroups: {
        blueprintjs: {
            test: /[\\/]node_modules[\\/](@blueprintjs)[\\/]/,
            name: 'blueprintjs',
            chunks: 'all',
            minChunks: 1,
            enforce: true,
            priority: 5
        },
        reactify: {
            test: /[\\/]node_modules[\\/](?:react|mobx)(?:-[a-z0-9\\-]*)?[\\/]/,
            name: 'reactify',
            chunks: 'all',
            minChunks: 1,
            enforce: true,
            priority: 4
        },
        evergreen: {
            test: /[\\/]node_modules[\\/](evergreen-ui|ui-box)[\\/]/,
            name: 'evergreen',
            chunks: 'all',
            minChunks: 1,
            enforce: true,
            priority: 2
        },
        vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
            minChunks: 1,
            enforce: true,
            reuseExistingChunk: true,
            priority: -1
        },
        default: {
            minChunks: 1,
            priority: -20,
            enforce: true,
            reuseExistingChunk: true
        }
    }
};
