import chalk from "chalk"; // Optional: for colored CLI output

export function handleResult<T>(
  result: {
    data?: T;
    error?: string;
  },
  context: string,
): T | undefined {
  if (result.error) {
    const prefix = context ? `[${context}] ` : "";
    console.error(chalk.red("Error:"), prefix + result.error);
    return undefined;
  }
  return result.data;
}
