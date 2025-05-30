const ICONS = {
  Task: "📝",
  Feature: "🌟",
  "User Story": "📖",
  Epic: "🗻",
  Other: "🔹",
} as const;

const cardStyles = /* css */ `
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
  }
  .card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    padding: 24px;
    width: 320px;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border: 2px solid #e1e4e8;
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .card.new {
    border-color: #2ecc40;
    box-shadow: 0 0 0 4px #2ecc4040;
    animation: pop-in 0.5s;
  }
  @keyframes pop-in {
    0% { transform: scale(0.95); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

function injectCardStyles() {
  if (!document.getElementById("card-styles")) {
    const style = document.createElement("style");
    style.id = "card-styles";
    style.textContent = cardStyles;
    document.head.appendChild(style);
  }
}

function renderCards(items: any) {
  injectCardStyles();
  const grid = document.getElementById("grid");
  if (grid) {
    grid.innerHTML = "";
  }
  for (const item of items) {
    const card = document.createElement("div");
    card.className = "card" + (item.isNew ? " new" : "");
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
