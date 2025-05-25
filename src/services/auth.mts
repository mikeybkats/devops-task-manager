import { ConfigService } from "./configService.mjs";
import { AuthState } from "../models/config.js";
import { authConfig, PatConfig } from "./authConfig.mjs";
import { getConfig } from "../config/env.js";

export class AuthService {
  private static instance: AuthService;
  private configService: ConfigService;
  private patConfig: PatConfig;

  private constructor() {
    this.configService = new ConfigService();
    this.patConfig = authConfig(getConfig());
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getAuthState(): AuthState {
    return this.configService.getAuthState();
  }

  public getPatConfig(): PatConfig {
    return { ...this.patConfig };
  }

  public async updatePatConfig(
    pat: string,
    organization: string,
  ): Promise<void> {
    // Update environment variables
    process.env.AZURE_PAT = pat;
    process.env.AZURE_ORGANIZATION = organization;

    // Update local config
    this.patConfig = {
      pat,
      organization,
    };

    // If currently authenticated, update the auth state with new PAT
    const authState = this.configService.getAuthState();
    if (authState.isAuthenticated) {
      authState.currentToken = {
        accessToken: pat,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // PATs typically last 1 year
      };
      this.configService.setAuthState(authState);
    }
  }

  public async logout(): Promise<void> {
    this.configService.clearAuthState();
  }

  public isAuthenticated(): boolean {
    const authState = this.configService.getAuthState();
    return (
      authState.isAuthenticated && Boolean(authState.currentToken?.accessToken)
    );
  }

  public getCurrentToken(): string | undefined {
    return this.configService.getAuthState().currentToken?.accessToken;
  }
}
