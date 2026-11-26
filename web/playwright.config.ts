import { defineConfig } from "@playwright/test";

// The browser end-to-end test drives a built site that is already serving, as a visitor's browser would:
// in CI the Docker image Railway runs (SITE=http://localhost:8080), here `uvicorn` on 8001 after
// `npm run build`. It never asks for an AI read, so it costs nothing on a site with a key.
const site = process.env.SITE ?? "http://localhost:8001";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  // A failure is a bug or a flaky test to fix, never something to run again until it passes.
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["./e2e/no-vacuous-pass.ts"]],
  outputDir: "test-results",
  use: {
    baseURL: site,
    // CI installs Playwright's own Chromium. This machine cannot download browsers, so it drives the
    // installed Chrome instead.
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
