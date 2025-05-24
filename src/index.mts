#!/usr/bin/env node

import { Command } from "commander";
import boxen from "boxen";
import chalk from "chalk";
import { select, input } from "@inquirer/prompts";
import ora from "ora";
import { getConfig } from "./config/env.js";
import { AuthService } from "./services/auth.js";

const program = new Command();
const authService = AuthService.getInstance();

// User state
interface UserState {
  username?: string;
  selectedProject?: string;
}

let userState: UserState = {};

// Display welcome message
const displayWelcome = () => {
  const message = boxen(chalk.bold("* Manage DevOps Agent *"), {
    padding: 1,
    margin: 1,
    borderStyle: "round",
    borderColor: "blue",
  });
  console.log(message);
};

// Display user info and project
const displayUserInfo = () => {
  const authState = authService.getAuthState();
  if (authState.isAuthenticated && authState.user) {
    console.log(chalk.green(`Logged in as: ${authState.user.name}`));
  }
  if (userState.selectedProject) {
    console.log(chalk.blue(`Current project: ${userState.selectedProject}`));
  }
  console.log(); // Add a blank line for spacing
};

// Work item type icons
const WORK_ITEM_ICONS: Record<string, string> = {
  Task: "📝",
  Feature: "🌟",
  "User Story": "📖",
  Epic: "🗻",
  Other: "🔹",
};

// Main menu options after project selection
const mainMenuOptions = [
  { name: "View All Work Items", value: "all" },
  { name: "View Tasks", value: "tasks" },
  { name: "View Epics", value: "epics" },
  { name: "View Features", value: "features" },
  { name: "View User Stories", value: "stories" },
  { name: "Chat Mode", value: "chat" },
  { name: "Create Project", value: "create" },
  { name: "Manage Project", value: "manage" },
  { name: "Switch Project", value: "switch" },
  { name: "Exit", value: "exit" },
];

// Fetch projects from Azure DevOps
interface DevOpsProject {
  id: string;
  name: string;
  [key: string]: unknown;
}

async function fetchProjects(): Promise<string[]> {
  const { azureOrganization, azurePat } = getConfig();
  const response = await fetch(
    `https://dev.azure.com/${azureOrganization}/_apis/projects?api-version=6.0`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${azurePat}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }
  const data: unknown = await response.json();
  if (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as any).value)
  ) {
    return (data as { value: DevOpsProject[] }).value.map(
      (project) => project.name,
    );
  }
  throw new Error("Unexpected response format from Azure DevOps API");
}

// Prompt user to select a project
async function selectProject() {
  const spinner = ora("Fetching projects...").start();
  try {
    const projects = await fetchProjects();
    spinner.succeed("Projects loaded");
    if (!projects.length) {
      console.log(
        chalk.yellow("No projects found. Please create a project first."),
      );
      await handleCreateProject();
      return await selectProject();
    }
    const answer = await select({
      message: "Select a project:",
      choices: projects.map((p) => ({ name: p, value: p })),
    });
    userState.selectedProject = answer;
  } catch (error) {
    spinner.fail("Failed to fetch projects");
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}

// Main menu loop after project selection
async function handleMainMenu() {
  displayUserInfo();
  const answer = await select({
    message: "What would you like to do?",
    choices: mainMenuOptions,
  });
  switch (answer) {
    case "all":
      await handleViewAllWorkItems();
      break;
    case "tasks":
      await handleViewTasks();
      break;
    case "epics":
      await handleViewEpics();
      break;
    case "features":
      await handleViewFeatures();
      break;
    case "stories":
      await handleViewStories();
      break;
    case "chat":
      await handleChatMode();
      break;
    case "create":
      await handleCreateProject();
      break;
    case "manage":
      await handleManageProject();
      break;
    case "switch":
      await selectProject();
      break;
    case "exit":
      process.exit(0);
  }
  await handleMainMenu();
}

// Fetch work items from Azure DevOps for the selected project and type
async function fetchWorkItems(
  project: string,
  type: string | null,
): Promise<
  { title: string; state: string; assignedTo: string; type: string }[]
> {
  const { azureOrganization, azurePat } = getConfig();
  // Build WIQL query
  let typeFilter =
    type && type !== "All" ? `AND [System.WorkItemType] = '${type}'` : "";
  const wiqlQuery = {
    query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}' ${typeFilter} ORDER BY [System.ChangedDate] DESC`,
  };
  const wiqlResponse = await fetch(
    `https://dev.azure.com/${azureOrganization}/${project}/_apis/wit/wiql?api-version=6.0`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`:${azurePat}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wiqlQuery),
    },
  );
  if (!wiqlResponse.ok) {
    throw new Error(`Failed to fetch work items: ${wiqlResponse.statusText}`);
  }
  const wiqlData: any = await wiqlResponse.json();
  const ids = wiqlData.workItems?.map((item: any) => item.id) || [];
  if (!ids.length) return [];
  // Fetch work item details in batches (max 200 per request)
  const batchSize = 200;
  let allItems: {
    title: string;
    state: string;
    assignedTo: string;
    type: string;
  }[] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize).join(",");
    const detailsResponse = await fetch(
      `https://dev.azure.com/${azureOrganization}/${project}/_apis/wit/workitems?ids=${batchIds}&fields=System.Title,System.State,System.AssignedTo,System.WorkItemType&api-version=6.0`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`:${azurePat}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!detailsResponse.ok) continue;
    const detailsData: any = await detailsResponse.json();
    const items = detailsData.value.map((item: any) => ({
      title: item.fields["System.Title"] || "(No Title)",
      state: item.fields["System.State"] || "",
      assignedTo: item.fields["System.AssignedTo"]?.displayName || "Unassigned",
      type: item.fields["System.WorkItemType"] || "Other",
    }));
    allItems = allItems.concat(items);
  }
  return allItems;
}

// Display work items as cards with icons
function displayWorkItemCards(
  items: { title: string; state: string; assignedTo: string; type: string }[],
) {
  if (!items.length) {
    console.log(chalk.yellow("No work items found for this project."));
    return;
  }
  for (const item of items) {
    const icon = WORK_ITEM_ICONS[item.type] || WORK_ITEM_ICONS.Other;
    const card = boxen(
      `${icon}  ${chalk.bold(item.title)}\n${chalk.cyan("Type:")} ${item.type}\n${chalk.cyan("Status:")} ${item.state}\n${chalk.magenta("Assigned to:")} ${item.assignedTo}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: item.state === "Done" ? "green" : "yellow",
      },
    );
    console.log(card);
  }
}

async function handleViewTasks() {
  await handleViewWorkItems("Task");
}

async function handleViewEpics() {
  await handleViewWorkItems("Epic");
}

async function handleViewFeatures() {
  await handleViewWorkItems("Feature");
}

async function handleViewStories() {
  await handleViewWorkItems("User Story");
}

async function handleViewAllWorkItems() {
  await handleViewWorkItems(null); // null means all types
}

async function handleViewWorkItems(type: string | null) {
  try {
    if (!userState.selectedProject) {
      console.log(chalk.red("No project selected."));
      return;
    }
    const spinner = ora("Fetching work items...").start();
    const items = await fetchWorkItems(userState.selectedProject, type);
    spinner.stop();
    displayWorkItemCards(items);
  } catch (error) {
    console.error(
      chalk.red("Failed to fetch work items:"),
      error instanceof Error ? error.message : error,
    );
  }
}

async function handleChatMode() {
  console.log(chalk.blue("Entering chat mode...")); // TODO: Implement
  const answer = await input({ message: 'Chat (type "exit" to return):' });
  if (answer.toLowerCase() === "exit") {
    return;
  }
  // TODO: Process chat input
  await handleChatMode();
}

async function handleCreateProject() {
  try {
    console.log(chalk.blue("\nCreate New Project"));
    console.log(chalk.gray("-------------------"));
    // Get project details
    const projectName = await input({
      message: "Project name:",
      validate: (input) => {
        if (!input.trim()) return "Project name is required";
        if (input.length < 3)
          return "Project name must be at least 3 characters";
        if (input.length > 50)
          return "Project name must be less than 50 characters";
        return true;
      },
    });
    const description = await input({
      message: "Project description (optional):",
      default: "",
    });
    const visibility = await select({
      message: "Project visibility:",
      choices: [
        { name: "Private", value: "private" },
        { name: "Public", value: "public" },
      ],
    });
    // Confirm creation
    const confirm = await select({
      message: "Create project with these settings?",
      choices: [
        { name: "Yes, create project", value: "yes" },
        { name: "No, cancel", value: "no" },
      ],
    });
    if (confirm === "no") {
      console.log(chalk.yellow("Project creation cancelled"));
      return;
    }
    const spinner = ora("Creating project...").start();
    try {
      // TODO: Implement actual project creation logic
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulated delay
      spinner.succeed(chalk.green("Project created successfully"));
      console.log(chalk.green(`\nProject "${projectName}" has been created.`));
      console.log(chalk.blue("You can now select it from the project list."));
    } catch (error) {
      spinner.fail(chalk.red("Failed to create project"));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("Error:"), error.message);
    }
  }
}

async function handleManageProject() {
  console.log(chalk.blue("Manage project...")); // TODO: Implement
}

// Main function
async function main() {
  displayWelcome();
  // Check for PAT at startup
  if (!process.env.AZURE_PAT) {
    console.error(
      chalk.red(
        "No Azure DevOps Personal Access Token found. Please set the AZURE_PAT environment variable.",
      ),
    );
    process.exit(1);
  }
  program
    .name("devopsagent")
    .description("AI-powered DevOps task management CLI tool")
    .version("1.0.0");
  await program.parseAsync(process.argv);
  // Prompt for project selection first
  await selectProject();
  // Start the main menu
  await handleMainMenu();
}

main();
