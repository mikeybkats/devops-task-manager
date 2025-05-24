import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../auth";
import { ConfigService } from "../configService";
import { getConfig } from "../../config/env";
import { EnvConfig } from "../../config/env";

// Mock the ConfigService
vi.mock("../configService");
vi.mock("../../config/env");

describe("AuthService", () => {
  let authService: AuthService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock getConfig
    const mockConfig: EnvConfig = {
      anthropicApiKey: "test-key",
      azurePat: "test-pat",
      azureOrganization: "test-org",
    };
    vi.mocked(getConfig).mockReturnValue(mockConfig);

    // Create mock ConfigService
    mockConfigService = {
      getAuthState: vi.fn(),
      setAuthState: vi.fn(),
      clearAuthState: vi.fn(),
      getAnthropicApiKey: vi.fn(),
      setAnthropicApiKey: vi.fn(),
      hasAnthropicApiKey: vi.fn(),
      getConfig: vi.fn(),
      updateConfig: vi.fn(),
      getLastProject: vi.fn(),
      getRecentProjects: vi.fn(),
      getConfigPath: vi.fn(),
    } as unknown as ConfigService;

    // Mock ConfigService constructor
    vi.mocked(ConfigService).mockImplementation(() => mockConfigService);

    // Get AuthService instance
    authService = AuthService.getInstance();
  });

  describe("getPatConfig", () => {
    it("should return a copy of the current PAT config", () => {
      const config = authService.getPatConfig();
      expect(config).toEqual({
        pat: "test-pat",
        organization: "test-org",
      });
      // Verify it's a copy
      config.pat = "modified";
      expect(authService.getPatConfig().pat).toBe("test-pat");
    });
  });

  describe("updatePatConfig", () => {
    it("should update PAT and organization configuration", async () => {
      const newPat = "new-pat";
      const newOrg = "new-org";

      await authService.updatePatConfig(newPat, newOrg);

      expect(process.env.AZURE_PAT).toBe(newPat);
      expect(process.env.AZURE_ORGANIZATION).toBe(newOrg);
      expect(authService.getPatConfig()).toEqual({
        pat: newPat,
        organization: newOrg,
      });
    });

    it("should update auth state if currently authenticated", async () => {
      // Set up authenticated state
      vi.mocked(mockConfigService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        currentToken: {
          accessToken: "old-pat",
          expiresAt: new Date(),
        },
      });

      const newPat = "new-pat";
      const newOrg = "new-org";

      await authService.updatePatConfig(newPat, newOrg);

      expect(mockConfigService.setAuthState).toHaveBeenCalledWith(
        expect.objectContaining({
          isAuthenticated: true,
          currentToken: expect.objectContaining({
            accessToken: newPat,
          }),
        }),
      );
    });

    it("should not update auth state if not authenticated", async () => {
      // Set up unauthenticated state
      vi.mocked(mockConfigService.getAuthState).mockReturnValue({
        isAuthenticated: false,
      });

      await authService.updatePatConfig("new-pat", "new-org");

      expect(mockConfigService.setAuthState).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("should clear auth state", async () => {
      await authService.logout();
      expect(mockConfigService.clearAuthState).toHaveBeenCalled();
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when authenticated", () => {
      vi.mocked(mockConfigService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        currentToken: {
          accessToken: "test-pat",
          expiresAt: new Date(),
        },
      });

      expect(authService.isAuthenticated()).toBe(true);
    });

    it("should return false when not authenticated", () => {
      vi.mocked(mockConfigService.getAuthState).mockReturnValue({
        isAuthenticated: false,
      });

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe("getCurrentToken", () => {
    it("should return current token when authenticated", () => {
      vi.mocked(mockConfigService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        currentToken: {
          accessToken: "test-pat",
          expiresAt: new Date(),
        },
      });

      expect(authService.getCurrentToken()).toBe("test-pat");
    });

    it("should return undefined when not authenticated", () => {
      vi.mocked(mockConfigService.getAuthState).mockReturnValue({
        isAuthenticated: false,
      });

      expect(authService.getCurrentToken()).toBeUndefined();
    });
  });
});
