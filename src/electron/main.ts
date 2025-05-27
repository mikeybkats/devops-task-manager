import { app, BrowserWindow, ipcMain } from "electron";
import { ElectronCommands, ElectronRenderData } from "../types";
import { WebSocketServer } from "ws";

let mainWindow: BrowserWindow | null = null;
let isRendererReady = false;
let pendingMessages: any[] = [];

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

  // Listen for when the renderer is ready
  // mainWindow.webContents.on("did-finish-load", () => {
  //   isRendererReady = true;
  //   // Send any pending messages
  //   pendingMessages.forEach(({ channel, message }) => {
  //     mainWindow?.webContents.send(channel, message);
  //   });
  //   pendingMessages = [];
  // });
}

function sendToRenderer(channel: string, message: any) {
  if (mainWindow && isRendererReady) {
    mainWindow.webContents.send(channel, message);
  } else {
    pendingMessages.push({ channel, message });
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (rawMessage: ElectronRenderData<ElectronCommands>) => {
    if (!mainWindow) {
      createWindow();
    }

    let message;
    try {
      message = JSON.parse(rawMessage.toString());
    } catch (e) {
      console.log("Failed to parse message:", rawMessage);
      return;
    }

    console.log("Received message from CLI:\n", message.type);

    switch (message.type) {
      case ElectronCommands.WORK_ITEMS:
        mainWindow?.webContents.send(ElectronCommands.WORK_ITEMS, message);
        sendToRenderer(ElectronCommands.WORK_ITEMS, message);
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
      case ElectronCommands.CLOSE_APP:
        console.log("Closing Electron app by CLI command");
        app.quit();
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

ipcMain.on("renderer-ready", () => {
  isRendererReady = true;
  if (mainWindow) {
    pendingMessages.forEach(({ channel, message }) => {
      if (mainWindow) {
        mainWindow.webContents.send(channel, message);
      }
    });
    pendingMessages = [];
  }
});
