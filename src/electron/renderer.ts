import { ipcRenderer } from "electron";
import { renderCards } from "./renderCards";
import { ElectronCommands, ElectronRenderData, WorkItem } from "../types";
import { renderDocument, renderStyles } from "./renderDocument";
import { clearDocument } from "./renderDocument";

renderStyles();

ipcRenderer.on(
  ElectronCommands.WORK_ITEMS,
  (_event, workItems: ElectronRenderData<WorkItem>) => {
    if (workItems.data) {
      clearDocument();
      renderDocument();
      renderCards(workItems.data);
    }
  },
);

ipcRenderer.send("renderer-ready");
