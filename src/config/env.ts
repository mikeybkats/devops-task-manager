import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config();

// Configuration interface
export interface EnvConfig {
  anthropicApiKey: string;
  azureClientId: string;
  azureClientSecret: string;
  configDir?: string;
}

// Validate required environment variables
function validateConfig(
  config: Partial<EnvConfig>,
): asserts config is EnvConfig {
  const requiredVars = [
    "anthropicApiKey",
    "azureClientId",
    "azureClientSecret",
  ];
  const missingVars = requiredVars.filter(
    (varName) => !config[varName as keyof EnvConfig],
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}\n` +
        "Please create a .env file with the required variables.",
    );
  }
}

// Get configuration from environment variables
export function getConfig(): EnvConfig {
  const config: Partial<EnvConfig> = {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    azureClientId: process.env.AZURE_CLIENT_ID,
    azureClientSecret: process.env.AZURE_CLIENT_SECRET,
    configDir: process.env.DEVOPS_AGENT_CONFIG_DIR,
  };

  validateConfig(config);
  return config;
}

// Get the configuration directory path
export function getConfigDir(): string {
  const config = getConfig();
  return (
    config.configDir ||
    path.join(
      process.env.HOME || process.env.USERPROFILE || "",
      ".devops-agent",
    )
  );
}
