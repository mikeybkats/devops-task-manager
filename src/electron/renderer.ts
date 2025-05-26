import { ipcRenderer } from "electron";
// import { renderDocument } from "./renderDocument";
// import { renderCards } from "./renderCards";
import { ElectronCommands } from "../types";

// renderDocument();

ipcRenderer.on(ElectronCommands.WORK_ITEMS, (_event, data) => {
  console.log("Received work items", JSON.stringify(data, null, 2));
  //   try {
  //     const items = JSON.parse(data);
  //     renderCards(items);
  //   } catch (e) {
  //     const grid = document.getElementById("grid");
  //     if (grid) {
  //       grid.innerHTML =
  //         '<div style="color:red">Failed to load work items.</div>';
  //     }
  //   }
});

// ipcRenderer.on("main-process-pid", (event, pid) => {
//   console.log("Main process PID received in renderer:", pid);
// });
