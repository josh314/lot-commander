const path = require('path');

const clientSrcPath = path.join(__dirname, "client");

// webpack plugins
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: {
    // js bundles
    app: path.join(clientSrcPath, 'index.js'),
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /public\/.*\.js$/,
        exclude: /(node_modules|bower_components)/,
        // use: [ 
        //   { 
        //     loader: 'babel-loader',
        //     options: {
        //       "presets": [
        //         [
        //           "@babel/preset-env",
        //           {
        //             "targets": ">0.1%",
        //             "useBuiltIns": "usage",
        //             "corejs": "3.0.0"
        //           }
        //         ],
        //         [
        //           "@babel/preset-react",
        //           {
        //             development: process.env.NODE_ENV !== 'production'
        //           }
        //         ]
        //       ]
        //     }
        //   },
        //   { loader: 'eslint-loader' }
        // ]
      },
      {
        test: /\.less$/,
        use:  [ 
          // 'style-loader',
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { url: false } },
          { 
            loader: 'less-loader',
            // options: { 
            //   paths: [ path.resolve(__dirname, 'node_modules') ] 
            // }
          }
        ]
      },
      // {
      //   test: /\.(svg|png|jpg|jpeg|ico)$/,
      //   use: [
      //     {
      //       loader: 'file-loader',
      //       options: {
      //         name: '[name].[ext]',
      //       }
      //     }
      //   ]
      // },
    ]
  },
  plugins: [
  //   new HtmlWebpackPlugin({
  //     template: 'src/client/index.html',
  //     minify: true
  //   }),
    new MiniCssExtractPlugin({
      filename: 'app.css',
    }),
    new CopyPlugin([
      { 
        from: path.join(clientSrcPath, '3rd-party'),
        to: '3rd-party'
      },
      { 
        from: path.join(clientSrcPath, 'favicon/database-171428/favicon.ico'),
        to: 'img'
      },
      { 
        from: path.join(clientSrcPath, 'fonts'),
        to: 'fonts'
      },
      { 
        from: path.join(clientSrcPath, 'partials'),
        to: 'partials'
      }
    ]),
  ],
};