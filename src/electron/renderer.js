const { ipcRenderer } = require("electron");

const ICONS = {
  Task: "📝",
  Feature: "🌟",
  "User Story": "📖",
  Epic: "🗻",
  Other: "🔹",
};

function renderCards(items) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  for (const item of items) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="icon">${ICONS[item.type] || ICONS.Other}</div>
      <div class="title">${item.title}</div>
      <div class="meta"><span class="status ${item.state}">${item.state}</span></div>
      <div class="meta">Type: ${item.type}</div>
      <div class="meta assigned">Assigned to: ${item.assignedTo}</div>
    `;
    grid.appendChild(card);
  }
}

ipcRenderer.on("work-items", (event, data) => {
  try {
    const items = JSON.parse(data);
    renderCards(items);
  } catch (e) {
    document.getElementById("grid").innerHTML =
      '<div style="color:red">Failed to load work items.</div>';
  }
});
