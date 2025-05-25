import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let electronProcess: ChildProcess | null = null;

export function startElectronRenderer() {
  if (electronProcess) return;
  const electronBinary = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    "electron",
  );
  const mainPath = path.join(
    process.cwd(),
    "dist",
    "src",
    "electron",
    "main.js",
  );
  electronProcess = spawn(electronBinary, [mainPath], {
    stdio: ["pipe", "pipe", "pipe", "ipc"],
    detached: true,
  });
}

export function sendWorkItemsToRenderer(items: unknown) {
  if (!electronProcess) {
    throw new Error("Electron process not started");
  }
  electronProcess.send?.({ type: "work-items", data: items });
}
