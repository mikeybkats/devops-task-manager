import { spawn, ChildProcess } from "child_process";
import path from "path";

let electronProcess: ChildProcess | null = null;

export function startElectronRenderer() {
  if (electronProcess) return;
  const electronBinary = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    "electron",
  );
  const mainPath = path.join(__dirname, "main.mjs");
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
