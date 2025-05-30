export async function safePrompt<T>(
  promptFn: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await promptFn();
  } catch (err: any) {
    // Inquirer v9+ and others may throw ExitPromptError or similar
    if (
      err?.isTtyError ||
      err?.message === "canceled" ||
      err?.name === "ExitPromptError" ||
      err?.code === "ERR_PROMPT_ABORT" // for some prompt libs
    ) {
      console.log("\nPrompt canceled. Exiting DevOps Task Manager. Goodbye!");
      process.exit(0);
    }
    throw err;
  }
}
