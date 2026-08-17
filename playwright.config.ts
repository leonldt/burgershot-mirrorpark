import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "api-flow.spec.ts",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // E2E läuft gegen den PRODUKTIONS-Server (schnell, keine Turbopack-Compiles)
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL!,
    },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});