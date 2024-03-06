const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {

  // devtool: 'eval-source-map',

  mode: 'development',

  devServer: {

    client: {
      overlay: false,
    },

    compress: true,

    historyApiFallback: true,

    hot: true,

    port: 9000,

    proxy: {
      '/': {
        target: 'http://localhost:8080',
      }
    },

    static: {
      directory: path.join(__dirname, 'dist'),
    }

  }

});