import path from 'path';

export default {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        include: [path.resolve(__dirname, 'index.js')],
        loader: 'babel-loader',
      },
    ],
  },
};
