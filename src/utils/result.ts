import chalk from "chalk"; // Optional: for colored CLI output

type Result<T> = {
  data?: T | T[];
  error?: string;
};

export function handleResult<T>(
  result: Result<T> | Result<T>[],
  context: string,
): T[] | T {
  if (Array.isArray(result)) {
    return result
      .flatMap((resultItem) => {
        if (
          typeof resultItem === "object" &&
          resultItem !== null &&
          "error" in resultItem
        ) {
          console.error(chalk.red("Error:"), resultItem.error);
        }
        return resultItem.data;
      })
      .filter(
        (item): item is T => item !== undefined && item !== null && item !== "",
      );
  }

  if (result.error) {
    const prefix = context ? `[${context}] ` : "";
    console.error(chalk.red("Error:"), prefix + result.error);
  }

  return result.data as T;
}
