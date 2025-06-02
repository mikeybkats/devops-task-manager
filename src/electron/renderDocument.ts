const cssStyles = /* css */ `
  body 
  { 
    font-family: sans-serif; 
    background: #f6f8fa; 
    margin: 0; 
    padding: 0; 
  }
  .container { 
    max-width: 1200px; 
    margin: 0 auto; 
  }
  .content {
    padding: 24px;
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

  const content = document.createElement("div");
  content.id = "content";
  content.className = "content";

  const heading = document.createElement("h1");
  heading.textContent = "DevOps Work Items";

  const grid = document.createElement("div");
  grid.id = "grid";
  grid.className = "grid";

  content.appendChild(heading);
  content.appendChild(grid);
  container.appendChild(content);
  document.body.appendChild(container);
}

function clearDocument() {
  const container = document.querySelector(".container");
  if (container) {
    container.remove();
  }
}

export { renderDocument, renderStyles, clearDocument };
