import { select } from "@inquirer/prompts";
import { AuthService } from "../services/auth";
import { closeElectronApp } from "./launcher";
import {
  displayUserInfo,
  handleViewAllWorkItems,
  handleViewTasks,
  handleViewEpics,
  handleViewFeatures,
  handleViewStories,
  handleChatMode,
  handleCreateProject,
  selectProject,
  displayWelcome,
} from "./handlers";

const authService = AuthService.getInstance();

const mainMenuOptions = [
  { name: "View All Work Items", value: "all" },
  { name: "View Tasks", value: "tasks" },
  { name: "View Epics", value: "epics" },
  { name: "View Features", value: "features" },
  { name: "View User Stories", value: "stories" },
  { name: "Chat Mode", value: "chat" },
  { name: "Switch Project", value: "switch_project" },
  { name: "Exit", value: "exit" },
];

async function handleMainMenu() {
  displayUserInfo(authService);

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
    case "switch_project":
      await selectProject();
      break;
    case "exit":
      closeElectronApp();
      process.exit(0);
  }
  await handleMainMenu();
}

export async function startCli() {
  displayWelcome();
  await selectProject();
  await handleMainMenu();
}
