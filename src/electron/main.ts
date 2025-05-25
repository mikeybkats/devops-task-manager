import { app, BrowserWindow } from "electron";
import path from "path";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "renderer.html"));
}

app.whenReady().then(() => {
  createWindow();

  // Listen for work item data from the parent process
  process.on("message", (msg: unknown) => {
    if (
      typeof msg === "object" &&
      msg !== null &&
      "type" in msg &&
      (msg as any).type === "work-items" &&
      mainWindow
    ) {
      mainWindow.webContents.send(
        "work-items",
        JSON.stringify((msg as any).data),
      );
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
