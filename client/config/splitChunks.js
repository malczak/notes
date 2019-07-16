// Shared split chunks config
module.exports = {
    cacheGroups: {
        reactify: {
            test: /[\\/]node_modules[\\/](?:react|mobx)(?:-[a-z0-9\\-]*)?[\\/]/,
            name: 'reactify',
            chunks: 'all',
            minChunks: 1,
            enforce: true,
            priority: 5
        },
        highlight: {
            test: /[\\/]node_modules[\\/](?:highlight\.js)[\\/]/,
            name: 'highlight',
            chunks: 'all',
            minChunks: 1,
            enforce: true,
            priority: 3
        },
        quill: {
            test: /[\\/]node_modules[\\/](?:quill.*)[\\/]/,
            name: 'quill',
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
