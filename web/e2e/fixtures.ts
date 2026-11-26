import { expect, test as base } from "@playwright/test";

/**
 * Playwright's `test`, plus a guard every test gets: it fails on any console error or uncaught exception.
 * A CSP refusal (an inline script, a stylesheet from another host) reaches the console as an error, so this
 * is also the site's CSP check. A test that expects one particular error removes it from `problems` itself.
 */
export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") problems.push(m.text());
      });
      page.on("pageerror", (e) => problems.push(String(e)));
      await use(problems);
      expect(problems, "console errors or CSP refusals").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
