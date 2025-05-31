import boxen from "boxen";
import chalk from "chalk";
import { select, input } from "@inquirer/prompts";
import ora from "ora";
import {
  createWorkItem,
  fetchProjects,
  fetchWorkItems,
  updateWorkItem,
} from "../services/devops";
import {
  createElectronWindow,
  isElectronWindowOpen,
  sendWorkItemsToRenderer,
} from "./launcher";
import { AuthService } from "../services/auth";
import { getAIResponse } from "../services/ai";
import { WorkItem } from "../types";
import { handleResult } from "../utils/result";
import { getConfig } from "../config/env";
import { safePrompt } from "../utils/safePrompt";

interface UserState {
  username?: string;
  selectedProject?: string;
  allWorkItems?: WorkItem[];
}
let userState: UserState = {};

let lastRenderedIds: Set<number> = new Set();

function displayWelcome() {
  const message = boxen(chalk.bold("* Manage DevOps Agent *"), {
    padding: 1,
    margin: 1,
    borderStyle: "round",
    borderColor: "blue",
  });
  console.log(message);
}

async function promptForUserFilter(): Promise<string | null> {
  const { azureUsers } = getConfig();
  if (!azureUsers || azureUsers.length === 0) return null;

  const answer = await select({
    message: "Filter by user (or select All):",
    choices: [
      { name: "All users", value: null },
      ...azureUsers.map((u) => ({ name: u, value: u })),
    ],
  });
  return answer;
}

function displayUserInfo(authService: AuthService) {
  const authState = authService.getAuthState();
  if (authState.isAuthenticated && authState.user) {
    console.log(chalk.green(`Logged in as: ${authState.user.name}`));
  }
  if (userState.selectedProject) {
    console.log(chalk.blue(`Current project: ${userState.selectedProject}`));
  }
}

async function selectProject() {
  const spinner = ora("Fetching projects...").start();
  const projectsResult = await fetchProjects();

  const projects = handleResult(projectsResult, "Failed to fetch projects.");
  if (!projects) {
    spinner.fail("Failed to fetch projects");
    return;
  }
  if (projects.length === 0) {
    console.log(
      chalk.yellow("No projects found. Please create a project first."),
    );
    await handleCreateProject();
    return await selectProject();
  }
  spinner.succeed("Projects loaded");

  const answer = await safePrompt(() =>
    select({
      message: "Select a project:",
      choices: projects.map((p) => ({ name: p, value: p })),
    }),
  );
  if (answer === undefined) return; // User canceled
  userState.selectedProject = answer;
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
  await handleViewWorkItems(null);
}

async function handleRenderWorkItems(updatedTasks: WorkItem[]) {
  const isOpen = await isElectronWindowOpen();
  if (!isOpen) {
    await createElectronWindow();
  }

  // Mark new items
  const currentIds = new Set(updatedTasks.map((item) => item.id));
  const itemsWithIsNew = updatedTasks.map((item) => ({
    ...item,
    isNew: !lastRenderedIds.has(item.id),
  }));
  // Update lastRenderedIds for next render
  lastRenderedIds = currentIds;

  sendWorkItemsToRenderer(itemsWithIsNew);
}

async function handleViewWorkItems(type: string | null) {
  const userFilter = await promptForUserFilter();

  if (!userState.selectedProject) {
    console.log(chalk.red("No project selected."));
    return;
  }

  const spinner = ora("Fetching work items...").start();
  const itemsResult = await fetchWorkItems(
    userState.selectedProject,
    type,
    userFilter,
  );
  spinner.stop();

  const items = handleResult(itemsResult, "Failed to fetch work items.");

  if (items) {
    userState.allWorkItems = items;
    await handleRenderWorkItems(items);
  }
}

async function handleChatMode() {
  console.log(chalk.blue("Entering chat mode..."));
  const answer = await input({ message: 'Chat (type "exit" to return):' });
  if (answer.toLowerCase() === "exit") {
    return;
  }

  if (!userState.selectedProject) {
    console.log(chalk.red("No project selected."));
    return;
  }

  let tasks;
  if (!userState.allWorkItems) {
    const tasksResult = await fetchWorkItems(
      userState.selectedProject,
      null,
      null,
    );
    tasks = handleResult(tasksResult, "Failed to fetch tasks.");
  } else {
    tasks = userState.allWorkItems;
  }

  if (tasks) {
    const newTasks = await getAIResponse(
      answer,
      userState.selectedProject,
      tasks,
    );

    console.log("handleChatMode -- ", newTasks.action);

    switch (newTasks.action) {
      case "create":
        const workItemResult = await createWorkItem(
          userState.selectedProject,
          newTasks.workItem.fields,
        );
        handleResult(workItemResult, "Failed to create work item.");
        break;
      case "update":
        const updateWorkItemResult = await updateWorkItem(
          userState.selectedProject,
          newTasks.workItem.id,
          newTasks.workItem.fields,
        );
        handleResult(updateWorkItemResult, "Failed to update work item.");
        break;
      case "none":
        console.log(chalk.yellow("Sorry, I didn't understand."));
        break;
      default:
        break;
    }

    const updatedTasksResult = await fetchWorkItems(
      userState.selectedProject,
      null,
      null,
    );
    const updatedTasks = handleResult(
      updatedTasksResult,
      "Failed to update tasks.",
    );

    if (updatedTasks) {
      await handleRenderWorkItems(updatedTasks);
    }
  }
}

async function handleCreateProject() {
  try {
    console.log(chalk.blue("\nCreate New Project"));
    console.log(chalk.gray("-------------------"));
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
      await new Promise((resolve) => setTimeout(resolve, 1500));
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
  console.log(chalk.blue("Manage project..."));
}

export {
  displayWelcome,
  displayUserInfo,
  selectProject,
  handleViewTasks,
  handleViewEpics,
  handleViewFeatures,
  handleViewStories,
  handleViewAllWorkItems,
  handleChatMode,
  handleCreateProject,
  handleManageProject,
};
