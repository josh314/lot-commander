const path = require('path');

const clientSrcPath = path.join(__dirname, "src");

// webpack plugins
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: {
    // js bundles
    app: path.join(clientSrcPath, 'index.js'),
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'dist'),
    assetModuleFilename: 'assets/[name][ext]'
  },
  module: {
    rules: [
      {
        test: /\.less$/,
        use:  [
          // 'style-loader',
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            // options: { url: false }
          },
          {
            loader: 'less-loader',
            // options: {
            //   paths: [ path.resolve(__dirname, 'node_modules') ]
            // }
          }
        ]
      },
      {
        test: /\.(ttf|otf|eot|svg|woff)(\?v=[0-9]\.[0-9]\.[0-9])?|(jpg|gif)$/,
        type: 'asset/resource'
      },
      {
        test: /\.(wav)$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [

    new MiniCssExtractPlugin({
      filename: 'app.css',
    }),

    new CopyPlugin({
      patterns: [
        {
          from: path.join(clientSrcPath, 'favicon/database-171428/favicon.ico'),
          to: 'img'
        },
        {
          from: path.join(clientSrcPath, 'partials'),
          to: 'partials'
        }
      ]
    }),

    new webpack.ProvidePlugin({
      'cptable': 'codepage'
    }),

    // overall linting
    // new ESLintPlugin({
    //   overrideConfigFile: path.resolve(__dirname, '.eslintrc.client.js'),
    //   context: path.join(__dirname, 'src/js/'),
    //   exclude: 'ng',
    // }),

    // angularjs linting
    new ESLintPlugin({
      overrideConfigFile: path.resolve(__dirname, '.eslintrc.angularjs.js'),
      context: path.join(__dirname, 'src/js/'),
    }),

  ],
  /* suppress node shims */
	node: false,
  resolve: {
		// alias: { "./dist/cpexcel.js": "" }
    fallback: {
      path: require.resolve("path-browserify"),
    }
	},
};