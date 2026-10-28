import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against demo mode: scripted interviewer, no backend or AWS.
// Python runs in the browser via Pyodide, fetched from jsDelivr on each test's first run.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5180",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx vite --port 5180 --strictPort",
    url: "http://localhost:5180",
    reuseExistingServer: false,
    env: { VITE_USE_MOCK: "true" },
  },
});
