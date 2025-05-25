const path = require("path");

module.exports = {
  mode: "production",
  entry: path.resolve(__dirname, "src/index.ts"),
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
    extensions: [".mts", ".ts", ".mjs", ".js", ".json"],
    conditionNames: ["import", "require", "node"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|mts)$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.mjs$/,
        type: "javascript/esm",
      },
    ],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
