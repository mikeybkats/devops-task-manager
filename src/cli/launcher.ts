import { ElectronCommands, WorkItem } from "../types";
import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8081");

export function sendWorkItemsToRenderer(items: WorkItem[]) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: ElectronCommands.WORK_ITEMS, data: items }));
  } else {
    // Otherwise, wait for it to open, then send once
    ws.once("open", () => {
      ws.send(
        JSON.stringify({ type: ElectronCommands.WORK_ITEMS, data: items }),
      );
    });
  }
}

export async function createElectronWindow(): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: ElectronCommands.CREATE_WINDOW }));
      resolve();
    } else {
      ws.once("open", () => {
        ws.send(JSON.stringify({ type: ElectronCommands.CREATE_WINDOW }));
        resolve();
      });
    }
  });
}

export function isElectronWindowOpen(): Promise<boolean> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) {
      // send message to server to check if window is open
      ws.send(JSON.stringify({ type: ElectronCommands.IS_WINDOW_OPEN }));
    } else {
      ws.once("open", () => {
        ws.send(JSON.stringify({ type: ElectronCommands.IS_WINDOW_OPEN }));
      });
    }
    ws.once("message", (data) => {
      // receive message from server
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === ElectronCommands.IS_WINDOW_OPEN) {
          resolve(!!msg.open);
        }
      } catch {
        resolve(false);
      }
    });
  });
}

export function closeElectronApp() {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: ElectronCommands.CLOSE_APP }));
  } else {
    ws.once("open", () => {
      ws.send(JSON.stringify({ type: ElectronCommands.CLOSE_APP }));
    });
  }
}
