const ICONS = {
  Task: "📝",
  Feature: "🌟",
  "User Story": "📖",
  Epic: "🗻",
  Other: "🔹",
} as const;

function renderCards(items: any) {
  const grid = document.getElementById("grid");
  if (grid) {
    grid.innerHTML = "";
  }
  for (const item of items) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="icon">${ICONS[item.type as keyof typeof ICONS] || ICONS.Other}</div>
      <div class="title">${item.title}</div>
      <div class="meta"><span class="status ${item.state}">${item.state}</span></div>
      <div class="meta">Type: ${item.type}</div>
      <div class="meta assigned">Assigned to: ${item.assignedTo}</div>
      <div class="meta parent">Parent: ${item.parent}</div>
    `;
    if (grid) {
      grid.appendChild(card);
    }
  }
}

export { renderCards };
