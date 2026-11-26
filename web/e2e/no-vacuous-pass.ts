import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

/**
 * A green run must have run every check. Fails the run when no test passed (a wrong `testMatch`, an empty
 * file) or when any test was skipped, and prints how many ran so a log shows the denominator.
 */
export default class NoVacuousPass implements Reporter {
  private passed = 0;
  private readonly skipped: string[] = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === "passed") this.passed += 1;
    if (result.status === "skipped") this.skipped.push(test.titlePath().join(" > "));
  }

  // Playwright takes a changed status only from a promise.
  async onEnd(result: FullResult): Promise<{ status: FullResult["status"] } | undefined> {
    if (this.passed === 0) {
      console.error("No browser check passed: the run tested nothing.");
      return { status: "failed" };
    }
    if (this.skipped.length > 0) {
      console.error(`Skipped, so the run is not a pass:\n  ${this.skipped.join("\n  ")}`);
      return { status: "failed" };
    }
    console.log(`${this.passed} browser checks passed, none skipped (run ${result.status}).`);
    return undefined;
  }
}
