import { app, BrowserWindow } from "electron";
import { ElectronCommands, ElectronRenderData } from "../types";
import { WebSocketServer } from "ws";

let mainWindow: BrowserWindow | null = null;

console.log("Electron main process started");
const wss = new WebSocketServer({ port: 8081 });

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadURL("about:blank");
  mainWindow.webContents.openDevTools();
  mainWindow.webContents.executeJavaScript(
    'require("./dist/src/electron/renderer.js")',
  );
}

wss.on("connection", (ws) => {
  ws.on("message", (message: ElectronRenderData<ElectronCommands>) => {
    if (!mainWindow) {
      createWindow();
    }

    console.log("Received message from CLI:\n", message.type);

    switch (message.type) {
      case ElectronCommands.WORK_ITEMS:
        mainWindow?.webContents.send(
          ElectronCommands.WORK_ITEMS,
          message.toString(),
        );
        break;
      case ElectronCommands.CREATE_WINDOW:
        createWindow();
        break;
      case ElectronCommands.IS_WINDOW_OPEN:
        ws.send(
          JSON.stringify({
            type: ElectronCommands.IS_WINDOW_OPEN,
            open: !!mainWindow,
          }),
        );
        break;
      default:
        console.log("Unknown message type:", message.type);
        break;
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
