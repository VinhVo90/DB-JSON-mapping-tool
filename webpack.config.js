const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const DIR_NAME = __dirname;
const isDebug = !process.env.PRO ? true : false;

const library = [
  'babel-polyfill',
  DIR_NAME + '/client/src/modules/graph-library/index.js',
];

module.exports = {
  devtool: "source-map",
  entry: {
    library: library
  },
  output: {
    path: path.resolve(DIR_NAME, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
      {
        test: /\.scss$/,
        use: [ 'style-loader', 'css-loader', 'sass-loader' ]
      }
    ]
	},
	mode: 'none'
};
