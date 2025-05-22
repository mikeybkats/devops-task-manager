// Theme type
export const enum Theme {
  Light = "light",
  Dark = "dark",
  System = "system",
}

// Authentication types
export interface AuthToken {
  accessToken: string;
  expiresAt: Date;
  refreshToken?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  currentToken?: AuthToken;
}

// Configuration types
export interface AppConfig {
  lastProject?: string;
  recentProjects?: string[];
  preferredView?: string;
  theme?: Theme;
  cacheTimeout?: number;
  maxResults?: number;
  customFields?: Record<string, any>;
}

// Default configuration values
export const DEFAULT_CONFIG: AppConfig = {
  recentProjects: [],
  preferredView: "list",
  theme: Theme.System,
  cacheTimeout: 300000, // 5 minutes
  maxResults: 50,
  customFields: {},
};
