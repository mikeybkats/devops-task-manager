import open from "open";
import http from "http";
import { URL } from "url";
import {
  PublicClientApplication,
  AuthenticationResult,
  AccountInfo,
  AuthorizationUrlRequest,
  InteractionRequiredAuthError,
} from "@azure/msal-node";
import { getConfig } from "../config/env";
import { AuthToken, AuthState } from "../models/config";
import { authConfig } from "./authConfig";

// Microsoft Entra ID scopes for Azure DevOps
const SCOPES = [
  "vso.work_full",
  "vso.workitem_write",
  // "vso.project_full",
  // "vso.code_full",
  // "vso.build_full",
  // "vso.release_full",
  // "vso.test_full",
  // "vso.wiki_full",
];

const REDIRECT_URI = "http://localhost:3000";

export class AuthService {
  private static instance: AuthService;
  private msalClient: PublicClientApplication;
  private authState: AuthState = {
    isAuthenticated: false,
  };

  private constructor() {
    const config = getConfig();
    this.msalClient = new PublicClientApplication(authConfig(config));
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getAuthState(): AuthState {
    return this.authState;
  }

  private async startServer(): Promise<string> {
    // Start local server to listen for the redirect
    const authCode = await new Promise<string>((resolve, reject) => {
      const server = http.createServer((req, res) => {
        console.log(`Received request: ${req.method} ${req.url}`);

        // Parse the URL and query parameters
        const reqUrl = new URL(req.url || "", REDIRECT_URI);
        const code = reqUrl.searchParams.get("code");
        const error = reqUrl.searchParams.get("error");

        if (code) {
          console.log("Authorization code received:", code);
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<h2>Authentication successful! You can close this window.</h2>",
          );
          server.close();
          resolve(code);
        } else if (error) {
          console.error("Error received in redirect:", error);
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<h2>Authentication error: ${error}</h2>`);
          server.close();
          reject(new Error(`Authentication error: ${error}`));
        } else {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end("<h2>Not found.</h2>");
        }
      });
      server.listen(3000);
    });

    return authCode;
  }

  public async login(): Promise<AuthState> {
    try {
      // Try silent token acquisition first
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();

      console.log("login -- accounts:", accounts);

      if (accounts.length > 0) {
        try {
          const silentResult = await this.msalClient.acquireTokenSilent({
            scopes: SCOPES,
            account: accounts[0],
          });
          if (silentResult) {
            this.updateAuthState(silentResult);
            return this.authState;
          }
        } catch (error) {
          if (error instanceof InteractionRequiredAuthError) {
            console.log(
              "Silent token acquisition failed, proceeding with browser login",
            );
          } else {
            console.error("Error during silent token acquisition:", error);
          }
        }
      }

      // Authorization Code Flow with browser
      const authCodeUrlParameters: AuthorizationUrlRequest = {
        scopes: SCOPES,
        redirectUri: REDIRECT_URI,
      };
      const authCodeUrl = await this.msalClient.getAuthCodeUrl(
        authCodeUrlParameters,
      );
      await open(authCodeUrl);
      console.log(
        "\nYour browser has been opened to authenticate with Microsoft.\n",
      );

      console.log("Starting server...");
      const authCode = await this.startServer();
      if (!authCode) {
        throw new Error("No authorization code received");
      }
      console.log("Authorization code received:", authCode);

      // Exchange code for tokens
      const tokenResponse = await this.msalClient.acquireTokenByCode({
        code: authCode,
        scopes: SCOPES,
        redirectUri: REDIRECT_URI,
      });
      if (!tokenResponse) {
        throw new Error("Failed to acquire token by code");
      }
      this.updateAuthState(tokenResponse);
      return this.authState;
    } catch (error) {
      console.error("Authentication failed:", error);
      throw new Error(
        "Failed to authenticate with Microsoft Entra ID using browser flow. Please check your configuration and try again.",
      );
    }
  }

  public async logout(): Promise<void> {
    if (this.authState.currentToken) {
      try {
        const accounts = await this.msalClient.getTokenCache().getAllAccounts();
        for (const account of accounts) {
          await this.msalClient.getTokenCache().removeAccount(account);
        }
      } catch (error) {
        console.error("Error clearing token cache:", error);
      }
    }
    this.authState = {
      isAuthenticated: false,
    };
  }

  public async getAccessToken(): Promise<string> {
    if (!this.authState.currentToken) {
      throw new Error("Not authenticated");
    }
    // Check if token needs refresh
    if (this.isTokenExpired(this.authState.currentToken)) {
      await this.refreshToken();
    }
    return this.authState.currentToken.accessToken;
  }

  private async refreshToken(): Promise<void> {
    try {
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found in token cache");
      }
      const result = await this.msalClient.acquireTokenSilent({
        scopes: SCOPES,
        account: accounts[0],
      });
      if (!result) {
        throw new Error("Failed to refresh token");
      }
      this.updateAuthState(result);
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw new Error("Failed to refresh authentication token");
    }
  }

  private updateAuthState(authResult: AuthenticationResult): void {
    this.authState = {
      isAuthenticated: true,
      user: this.createUserInfo(authResult.account),
      currentToken: this.createAuthToken(authResult),
    };
  }

  private createAuthToken(authResult: AuthenticationResult): AuthToken {
    return {
      accessToken: authResult.accessToken,
      expiresAt: new Date(
        authResult.expiresOn?.getTime() || Date.now() + 3600 * 1000,
      ),
      refreshToken: undefined, // MSAL handles token refresh internally
    };
  }

  private createUserInfo(account: AccountInfo | null): AuthState["user"] {
    if (!account) {
      throw new Error("No account information available");
    }
    return {
      id: account.localAccountId,
      name: account.name || "",
      email: account.username || "",
    };
  }

  private isTokenExpired(token: AuthToken): boolean {
    return token.expiresAt.getTime() <= Date.now() + 5 * 60 * 1000; // 5 minutes buffer
  }
}
