import { EnvConfig } from "@/config/env";
import { Configuration, LogLevel } from "@azure/msal-node";

export const authConfig = (config: EnvConfig): Configuration => ({
  auth: {
    clientId: config.azureClientId,
    authority: `https://login.microsoftonline.com/${config.azureTenantId}`,
    knownAuthorities: ["login.microsoftonline.com"],
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Trace,
    },
  },
});
