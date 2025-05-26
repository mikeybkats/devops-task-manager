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

export function createElectronWindow() {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: ElectronCommands.CREATE_WINDOW }));
  } else {
    ws.once("open", () => {
      ws.send(JSON.stringify({ type: ElectronCommands.CREATE_WINDOW }));
    });
  }
}

export function isElectronWindowOpen(): Promise<boolean> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log("Sending is window open message");
      ws.send(JSON.stringify({ type: ElectronCommands.IS_WINDOW_OPEN }));
    } else {
      ws.once("open", () => {
        ws.send(JSON.stringify({ type: ElectronCommands.IS_WINDOW_OPEN }));
      });
    }
    ws.once("message", (data) => {
      console.log("Received message from renderer:", data.toString());
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
