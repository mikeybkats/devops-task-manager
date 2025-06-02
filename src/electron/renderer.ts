import { ipcRenderer } from "electron";
import { renderCards } from "./renderCards";
import { ElectronCommands, ElectronRenderData, WorkItem } from "../types";
import { renderDocument, renderStyles } from "./renderDocument";
import { clearDocument } from "./renderDocument";
import { renderFilters } from "./renderFilters";

renderStyles();

let currentWorkItems: WorkItem[] = [];

function renderWorkItems(items: WorkItem[]) {
  clearDocument();
  renderDocument();
  currentWorkItems = items;
  renderFilters(currentWorkItems, (filteredItems) => {
    renderCards(filteredItems);
  });
  renderCards(currentWorkItems);
}

ipcRenderer.on(
  ElectronCommands.WORK_ITEMS,
  (_event, workItems: ElectronRenderData<WorkItem>) => {
    if (workItems.data) {
      renderWorkItems(workItems.data);
    }
  },
);

ipcRenderer.send("renderer-ready");
