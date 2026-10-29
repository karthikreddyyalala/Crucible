import { expect, test } from "@playwright/test";
import { currentProblem, getToFirstQuestion, run, session, setCode, startSession } from "./helpers";

test("a junior coding round: solve, run, submit, review", async ({ page }) => {
  await startSession(page, { mode: "Coding", level: "Junior" });
  await getToFirstQuestion(page);

  const problem = await currentProblem(page);
  await expect(page.getByRole("heading", { level: 1, name: problem.title, exact: true })).toBeVisible();

  const examples = problem.visibleTestCount;
  const hidden = problem.tests.length - examples;
  await setCode(page, problem.referenceSolution);
  await run(page);
  await expect(page.getByText(`${examples} of ${examples} examples passed`, { exact: true })).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText(`Hidden tests: ${hidden} of ${hidden} passed`, { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Step 3 of 3: Review")).toBeAttached();
  await expect(page.getByText("Okay, it passes. What's the time and space complexity?")).toBeVisible();
  expect((await session(page)).codingStage).toBe("review");
});
