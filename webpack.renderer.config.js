const path = require("path");

module.exports = {
  mode: "production",
  entry: path.resolve(__dirname, "src/electron/renderer.js"),
  target: "web",
  output: {
    path: path.resolve(__dirname, "dist/src/electron"),
    filename: "renderer.js",
    chunkFilename: "[name].chunk.js",
    publicPath: "",
  },
  resolve: {
    extensions: [".js", ".ts", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    splitChunks: {
      chunks: "all",
    },
  },
  externals: {
    electron: 'require("electron")',
  },
};
