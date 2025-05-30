const cssStyles = /* css */ `
  body 
  { 
    font-family: sans-serif; 
    background: #f6f8fa; 
    margin: 0; 
    padding: 24px; 
  }
  .container { 
    max-width: 1200px; 
    margin: 32px auto; 
  }
  .grid { 
    display: flex; 
    flex-wrap: wrap; 
    gap: 24px; 
  }
 `;

function renderStyles() {
  // Create and append styles
  const style = document.createElement("style");
  style.textContent = cssStyles;
  document.head.appendChild(style);
}

function renderDocument() {
  // Create and append container and grid
  const container = document.createElement("div");
  container.className = "container";
  const heading = document.createElement("h1");
  heading.textContent = "DevOps Work Items";
  const grid = document.createElement("div");
  grid.id = "grid";
  grid.className = "grid";
  container.appendChild(heading);
  container.appendChild(grid);
  document.body.appendChild(container);
}

function clearDocument() {
  const container = document.querySelector(".container");
  if (container) {
    container.remove();
  }
}

export { renderDocument, renderStyles, clearDocument };
