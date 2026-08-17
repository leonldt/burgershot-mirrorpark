import { defineConfig } from "@playwright/test";

/**
 * Browserlose E2E-Suite (nur request-FixTure): läuft überall – auch ohne
 * Browser-Dependencies. Nutzt denselben Dev-Server gegen die Test-DB.
 */
const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/burgershot_test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "api-flow.spec.ts",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: TEST_URL,
      TEST_DATABASE_URL: TEST_URL,
    },
  },
  projects: [{ name: "api", testMatch: "api-flow.spec.ts" }],
});