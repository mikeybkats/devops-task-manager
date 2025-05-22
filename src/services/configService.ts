import Conf from "conf";
import { AppConfig, AuthState, Theme } from "../models/config";
import crypto from "crypto";
import os from "os";
import path from "path";

interface ConfigSchema {
  anthropicApiKey: string;
  authState: AuthState;
  config: AppConfig;
}

export class ConfigService {
  private store: Conf<ConfigSchema>;
  private readonly configName = "devops-task-manager";
  private readonly configDir: string;

  constructor() {
    // Generate a machine-specific encryption key
    const machineId = crypto
      .createHash("sha256")
      .update(os.hostname() + os.userInfo().username)
      .digest("hex")
      .slice(0, 32);

    // Allow custom config directory through environment variable
    this.configDir =
      process.env.DEVOPS_AGENT_CONFIG_DIR ||
      path.join(os.homedir(), ".config", this.configName);

    this.store = new Conf<ConfigSchema>({
      schema: {
        anthropicApiKey: {
          type: "string",
          default: process.env.ANTHROPIC_API_KEY || "",
        },
        authState: {
          type: "object",
          default: {
            isAuthenticated: false,
          },
        },
        config: {
          type: "object",
          default: {
            recentProjects: [],
            preferredView: "list",
            theme: Theme.System,
            cacheTimeout: 300000,
            maxResults: 50,
            customFields: {},
          },
        },
      },
      configName: this.configName,
      cwd: this.configDir,
      encryptionKey: machineId,
    });
  }

  // Anthropic API Key management
  getAnthropicApiKey(): string {
    // First try environment variable
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey) {
      return envKey;
    }
    // Fall back to stored key
    return this.store.get("anthropicApiKey");
  }

  setAnthropicApiKey(key: string): void {
    this.store.set("anthropicApiKey", key);
  }

  hasAnthropicApiKey(): boolean {
    return Boolean(this.getAnthropicApiKey());
  }

  // Authentication state management
  getAuthState(): AuthState {
    return this.store.get("authState");
  }

  setAuthState(state: AuthState): void {
    this.store.set("authState", state);
  }

  clearAuthState(): void {
    this.store.set("authState", { isAuthenticated: false });
  }

  // App configuration management
  getConfig(): AppConfig {
    return this.store.get("config");
  }

  updateConfig(updates: Partial<AppConfig>): void {
    const currentConfig = this.getConfig();
    this.store.set("config", { ...currentConfig, ...updates });
  }

  // Project management
  getLastProject(): string | undefined {
    return this.store.get("config.lastProject");
  }

  setLastProject(project: string): void {
    const config = this.getConfig();
    const recentProjects = config.recentProjects || [];

    // Add to recent projects if not already present
    if (!recentProjects.includes(project)) {
      recentProjects.unshift(project);
      // Keep only the 5 most recent projects
      if (recentProjects.length > 5) {
        recentProjects.pop();
      }
    }

    this.updateConfig({
      lastProject: project,
      recentProjects,
    });
  }

  getRecentProjects(): string[] {
    return this.store.get("config.recentProjects") || [];
  }

  // Get the config file path
  getConfigPath(): string {
    return this.store.path;
  }

  // Clear all stored data
  clearAll(): void {
    this.store.clear();
  }
}
