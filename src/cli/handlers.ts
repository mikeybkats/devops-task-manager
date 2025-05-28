import boxen from "boxen";
import chalk from "chalk";
import { select, input } from "@inquirer/prompts";
import ora from "ora";
import {
  createWorkItem,
  fetchProjects,
  fetchWorkItems,
} from "../services/devops";
import {
  createElectronWindow,
  isElectronWindowOpen,
  sendWorkItemsToRenderer,
} from "./launcher";
import { AuthService } from "../services/auth";
import { getAIResponse } from "../services/ai";
import { WorkItem } from "../types";

interface UserState {
  username?: string;
  selectedProject?: string;
}
let userState: UserState = {};

function displayWelcome() {
  const message = boxen(chalk.bold("* Manage DevOps Agent *"), {
    padding: 1,
    margin: 1,
    borderStyle: "round",
    borderColor: "blue",
  });
  console.log(message);
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

  sendWorkItemsToRenderer(updatedTasks);
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

    await handleRenderWorkItems(items);
  } catch (error) {
    console.error(
      chalk.red("Failed to fetch work items:"),
      error instanceof Error ? error.message : error,
    );
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

  const tasks = await fetchWorkItems(userState.selectedProject, null); // or filter as needed
  const newTasks = await getAIResponse(
    answer,
    userState.selectedProject,
    tasks,
  );
  console.log(newTasks);

  switch (newTasks.action) {
    case "create":
      try {
        createWorkItem(userState.selectedProject, newTasks.workItem.fields);
      } catch (error) {
        console.error(chalk.red("Failed to create work item:"), error);
      }
      break;
    default:
      break;
  }

  const updatedTasks = await fetchWorkItems(userState.selectedProject, null);
  await handleRenderWorkItems(updatedTasks);
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
