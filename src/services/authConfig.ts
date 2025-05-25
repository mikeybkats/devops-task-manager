import { EnvConfig } from "../config/env";

export interface PatConfig {
  pat: string;
  organization: string;
}

export const authConfig = (config: EnvConfig): PatConfig => ({
  pat: config.azurePat || "",
  organization: config.azureOrganization || "",
});
