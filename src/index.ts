#!/usr/bin/env node

import { Command } from "commander";
import boxen from "boxen";
import chalk from "chalk";
import { select, input } from "@inquirer/prompts";
import ora from "ora";
import { getConfig } from "./config/env";
import { AuthService } from "./services/auth";

const program = new Command();
const authService = AuthService.getInstance();

// User state
interface UserState {
  isLoggedIn: boolean;
  username?: string;
  selectedProject?: string;
}

let userState: UserState = {
  isLoggedIn: false,
};

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

// Display user info if logged in
const displayUserInfo = () => {
  const authState = authService.getAuthState();
  if (authState.isAuthenticated && authState.user) {
    console.log(chalk.green(`Logged in as: ${authState.user.name}`));
    if (userState.selectedProject) {
      console.log(chalk.blue(`Current project: ${userState.selectedProject}`));
    }
    console.log(); // Add a blank line for spacing
  }
};

// Main menu options (initial state)
const mainMenuOptions = [
  { name: "Login", value: "login" },
  { name: "Exit", value: "exit" },
];

// Project menu options (shown after login)
const projectMenuOptions = [
  { name: "Create Project", value: "create" },
  { name: "Select Project", value: "select" },
  { name: "Logout / Login as a different user", value: "logout" },
  { name: "Exit", value: "exit" },
];

// Task menu options (shown after project selection)
const taskMenuOptions = [
  { name: "View Tasks", value: "tasks" },
  { name: "View Epics", value: "epics" },
  { name: "View Features", value: "features" },
  { name: "View User Stories", value: "stories" },
  { name: "Chat Mode", value: "chat" },
  { name: "Switch Project", value: "switch" },
  { name: "Logout", value: "logout" },
  { name: "Exit", value: "exit" },
];

// Handle main menu selection
async function handleMainMenu() {
  try {
    // Validate environment configuration
    getConfig();

    displayUserInfo();

    const answer = await select({
      message: "Choose an option:",
      choices: mainMenuOptions,
    });

    switch (answer) {
      case "login":
        await handleLogin();
        break;
      case "exit":
        process.exit(0);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("Configuration Error:"), error.message);
    } else {
      console.error(chalk.red("An unexpected error occurred"));
    }
    process.exit(1);
  }
}

// Handle project menu selection
async function handleProjectMenu() {
  displayUserInfo();

  const answer = await select({
    message: "What would you like to do?",
    choices: projectMenuOptions,
  });

  switch (answer) {
    case "select":
      await handleProjectSelection();
      break;
    case "logout":
      await handleLogout();
      break;
    case "create":
      await handleCreateProject();
      break;
    case "exit":
      process.exit(0);
  }

  // Continue the menu loop
  await handleProjectMenu();
}

// Handle task menu selection
async function handleTaskMenu() {
  displayUserInfo();

  const answer = await select({
    message: "What would you like to do?",
    choices: taskMenuOptions,
  });

  switch (answer) {
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
    case "switch":
      await handleProjectSelection();
      break;
    case "logout":
      await handleLogout();
      break;
    case "exit":
      process.exit(0);
  }

  // Continue the menu loop
  await handleTaskMenu();
}

// Placeholder handlers for different actions
async function handleLogin() {
  const spinner = ora("Logging in...").start();
  try {
    await authService.login();
    console.log(chalk.green("✅ Login successful!"));
    const user = authService.getAuthState().user;
    if (user) {
      console.log(`Welcome, ${user.name || user.email}!`);
    }
    // await handleProjectMenu();
  } catch (error) {
    spinner.fail(chalk.red("✖ Login failed"));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    // await handleMainMenu();
  }
}

async function handleProjectSelection() {
  const projects = ["Project 1", "Project 2", "Project 3"]; // TODO: Get actual projects
  const answer = await select({
    message: "Select a project:",
    choices: projects.map((p) => ({ name: p, value: p })),
  });
  userState.selectedProject = answer;
  console.log(chalk.green(`Selected project: ${answer}`));
  await handleTaskMenu();
}

async function handleViewTasks() {
  console.log(chalk.blue("Viewing tasks...")); // TODO: Implement
}

async function handleViewEpics() {
  console.log(chalk.blue("Viewing epics...")); // TODO: Implement
}

async function handleViewFeatures() {
  console.log(chalk.blue("Viewing features...")); // TODO: Implement
}

async function handleViewStories() {
  console.log(chalk.blue("Viewing user stories...")); // TODO: Implement
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

async function handleLogout() {
  const spinner = ora("Logging out...").start();
  try {
    await authService.logout();
    userState = {
      isLoggedIn: false,
    };
    spinner.succeed("Logged out successfully");
    await handleMainMenu();
  } catch (error) {
    spinner.fail("Logout failed");
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    await handleProjectMenu();
  }
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

      // Return to project menu without selecting the new project
      await handleProjectMenu();
    } catch (error) {
      spinner.fail(chalk.red("Failed to create project"));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      await handleProjectMenu();
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("Error:"), error.message);
    }
    await handleProjectMenu();
  }
}

// Main function
async function main() {
  displayWelcome();

  program
    .name("devopsagent")
    .description("AI-powered DevOps task management CLI tool")
    .version("1.0.0");

  // Parse command line arguments
  await program.parseAsync(process.argv);

  // Start the REPL
  await handleMainMenu();
}

// Run the application
main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
