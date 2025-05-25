const path = require("path");

module.exports = {
  mode: "production",
  entry: path.resolve(__dirname, "src/index.mts"),
  target: "node",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.mjs",
    libraryTarget: "module",
    module: true,
  },
  experiments: {
    outputModule: true,
  },
  resolve: {
    extensions: [".mts", ".mjs", ".ts", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|mts)$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
