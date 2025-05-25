const path = require("path");

module.exports = {
  mode: "production",
  entry: {
    renderer: path.resolve(__dirname, "src/electron/renderer.ts"),
    main: path.resolve(__dirname, "src/electron/main.ts"),
  },
  target: "electron-main",

  output: {
    path: path.resolve(__dirname, "dist/src/electron"),
    chunkFilename: "[name].chunk.js",
  },
  resolve: {
    extensions: [".js", ".ts", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    electron: "require('electron')",
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
