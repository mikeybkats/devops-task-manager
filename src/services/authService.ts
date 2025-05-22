import {
  ConfidentialClientApplication,
  AuthenticationResult,
} from "@azure/msal-node";
import { ConfigService } from "./configService";
import { AuthState, AuthToken } from "../models/config";

export class AuthService {
  private msalApp: ConfidentialClientApplication;
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;

    // Initialize MSAL
    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID || "",
        authority: "https://login.microsoftonline.com/common",
        clientSecret: process.env.AZURE_CLIENT_SECRET || "",
      },
      cache: {
        cachePlugin: {
          beforeCacheAccess: async (cacheContext) => {
            const authState = this.configService.getAuthState();
            if (authState.currentToken) {
              cacheContext.tokenCache.deserialize(
                JSON.stringify(authState.currentToken),
              );
            }
          },
          afterCacheAccess: async (cacheContext) => {
            if (cacheContext.cacheHasChanged) {
              const cache = cacheContext.tokenCache.serialize();
              this.configService.setAuthState({
                ...this.configService.getAuthState(),
                currentToken: JSON.parse(cache),
              });
            }
          },
        },
      },
    });
  }

  async login(): Promise<AuthState> {
    try {
      // Get token for Azure DevOps
      const result = await this.msalApp.acquireTokenByClientCredential({
        scopes: ["499b84ac-1321-427f-aa17-267ca6975798/.default"], // Azure DevOps scope
      });

      if (!result) {
        throw new Error("Failed to acquire token");
      }

      // Update auth state
      const authState: AuthState = {
        isAuthenticated: true,
        user: {
          id: result.account?.homeAccountId || "",
          name: result.account?.name || "",
          email: result.account?.username || "",
        },
        currentToken: {
          accessToken: result.accessToken,
          expiresAt: new Date(result.expiresOn?.getTime() || 0),
        },
      };

      this.configService.setAuthState(authState);
      return authState;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const authState = this.configService.getAuthState();
      if (authState.currentToken) {
        await this.msalApp.clearCache();
      }
      this.configService.clearAuthState();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }

  async refreshToken(): Promise<AuthToken> {
    try {
      const authState = this.configService.getAuthState();
      if (!authState.currentToken) {
        throw new Error("No token available");
      }

      const result = await this.msalApp.acquireTokenSilent({
        scopes: ["499b84ac-1321-427f-aa17-267ca6975798/.default"],
        account: authState.user
          ? {
              homeAccountId: authState.user.id,
              username: authState.user.email,
            }
          : undefined,
      });

      if (!result) {
        throw new Error("Failed to refresh token");
      }

      const newToken: AuthToken = {
        accessToken: result.accessToken,
        expiresAt: new Date(result.expiresOn?.getTime() || 0),
      };

      this.configService.setAuthState({
        ...authState,
        currentToken: newToken,
      });

      return newToken;
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    const authState = this.configService.getAuthState();
    return (
      authState.isAuthenticated && Boolean(authState.currentToken?.accessToken)
    );
  }

  getCurrentToken(): AuthToken | undefined {
    return this.configService.getAuthState().currentToken;
  }
}
