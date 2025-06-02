import { WorkItem } from "../types";

const filterStyles = /* css */ `
  .filters {
    padding: 16px;
    background: #f6f8fa;
    border-bottom: 1px solid #e1e4e8;
    display: flex;
    gap: 16px;
    align-items: center;
  }
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .filter-label {
    font-size: 12px;
    color: #586069;
    font-weight: 500;
  }
  .filter-select {
    padding: 6px 8px;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    background: white;
    font-size: 14px;
    min-width: 120px;
  }
  .filter-input {
    padding: 6px 8px;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    background: white;
    font-size: 14px;
    min-width: 200px;
  }
  .filter-select:focus, .filter-input:focus {
    outline: none;
    border-color: #0366d6;
    box-shadow: 0 0 0 3px rgba(3,102,214,0.1);
  }
`;

function injectFilterStyles() {
  if (!document.getElementById("filter-styles")) {
    const style = document.createElement("style");
    style.id = "filter-styles";
    style.textContent = filterStyles;
    document.head.appendChild(style);
  }
}

export function renderFilters(
  items: WorkItem[],
  onFilterChange: (filteredItems: WorkItem[]) => void,
) {
  injectFilterStyles();

  // Create filters container
  const filtersContainer = document.createElement("div");
  filtersContainer.className = "filters";

  // Create type filter
  const typeFilterGroup = document.createElement("div");
  typeFilterGroup.className = "filter-group";
  typeFilterGroup.innerHTML = `
    <label class="filter-label">Filter by Type</label>
    <select class="filter-select" id="type-filter">
      <option value="">All Types</option>
      <option value="Task">Task</option>
      <option value="Feature">Feature</option>
      <option value="User Story">User Story</option>
      <option value="Epic">Epic</option>
    </select>
  `;

  // Create title filter
  const titleFilterGroup = document.createElement("div");
  titleFilterGroup.className = "filter-group";
  titleFilterGroup.innerHTML = `
    <label class="filter-label">Filter by Title</label>
    <input type="text" class="filter-input" id="title-filter" placeholder="Search titles...">
  `;

  // Add filters to container
  filtersContainer.appendChild(typeFilterGroup);
  filtersContainer.appendChild(titleFilterGroup);

  // Insert filters at the top of the document
  const content = document.getElementById("content");
  if (content) {
    content.insertBefore(filtersContainer, content.firstChild);
  }

  // Add event listeners
  const typeFilter = document.getElementById(
    "type-filter",
  ) as HTMLSelectElement;
  const titleFilter = document.getElementById(
    "title-filter",
  ) as HTMLInputElement;

  function applyFilters() {
    const selectedType = typeFilter.value;
    const searchText = titleFilter.value.toLowerCase();

    const filteredItems = items.filter((item) => {
      const matchesType = !selectedType || item.type === selectedType;
      const matchesTitle =
        !searchText || item.title.toLowerCase().includes(searchText);
      return matchesType && matchesTitle;
    });

    onFilterChange(filteredItems);
  }

  typeFilter.addEventListener("change", applyFilters);
  titleFilter.addEventListener("input", applyFilters);
}
