#!/usr/bin/env node

import { Command } from "commander";
import boxen from "boxen";
import chalk from "chalk";
import { select, input } from "@inquirer/prompts";
import ora from "ora";

const program = new Command();

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

// Main menu options
const mainMenuOptions = [
  { name: "Login", value: "login" },
  { name: "Select Project", value: "project" },
  { name: "View Tasks", value: "tasks" },
  { name: "View Epics", value: "epics" },
  { name: "View Features", value: "features" },
  { name: "View User Stories", value: "stories" },
  { name: "Chat Mode", value: "chat" },
  { name: "Exit", value: "exit" },
];

// Project menu options (shown after login)
const projectMenuOptions = [
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
  const answer = await select({
    message: "Choose an option:",
    choices: mainMenuOptions,
  });

  switch (answer) {
    case "login":
      await handleLogin();
      break;
    case "project":
      await handleProjectSelection();
      break;
    case "exit":
      process.exit(0);
    default:
      console.log(chalk.yellow("Please login first."));
      await handleMainMenu();
  }
}

// Handle project menu selection
async function handleProjectMenu() {
  const answer = await select({
    message: "What would you like to do?",
    choices: projectMenuOptions,
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
  await handleProjectMenu();
}

// Placeholder handlers for different actions
async function handleLogin() {
  const spinner = ora("Logging in...").start();
  // TODO: Implement actual login logic
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated delay
  spinner.succeed("Logged in successfully");
  await handleProjectMenu();
}

async function handleProjectSelection() {
  const projects = ["Project 1", "Project 2", "Project 3"]; // TODO: Get actual projects
  const answer = await select({
    message: "Select a project:",
    choices: projects.map((p) => ({ name: p, value: p })),
  });
  console.log(chalk.green(`Selected project: ${answer}`));
  await handleProjectMenu();
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
  // TODO: Implement actual logout logic
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated delay
  spinner.succeed("Logged out successfully");
  await handleMainMenu();
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
