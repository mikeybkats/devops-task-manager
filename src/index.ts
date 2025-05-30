#!/usr/bin/env node
import { startCli } from "./cli/menu";

process.on("SIGINT", () => {
  console.log("\nExiting DevOps Task Manager. Goodbye!");
  process.exit(0);
});

async function main() {
  if (!process.env.AZURE_PAT) {
    // eslint-disable-next-line no-console
    console.error(
      "No Azure DevOps Personal Access Token found. Please set the AZURE_PAT environment variable.",
    );
    process.exit(1);
  }

  await startCli();
}

main();
