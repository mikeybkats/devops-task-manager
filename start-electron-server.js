const { spawn } = require("child_process");
const path = require("path");

const electronBinary = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  "electron",
);
const mainPath = path.join(process.cwd(), "dist", "src", "electron", "main.js");

const electronProcess = spawn(electronBinary, [mainPath], {
  stdio: "inherit",
  detached: false,
});

electronProcess.on("close", (code) => {
  console.log(`Electron server exited with code ${code}`);
});
