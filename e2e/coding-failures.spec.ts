import { expect, test } from "@playwright/test";
import { currentProblem, editor, getToFirstQuestion, run, setCode, startSession } from "./helpers";

test("failing runs: wrong answer, syntax error, infinite loop, then a passing run", async ({ page }) => {
  await startSession(page, { mode: "Coding", level: "Junior" });
  await getToFirstQuestion(page);
  const problem = await currentProblem(page);
  const fn = problem.functionName;
  const examples = problem.visibleTestCount;
  const results = page.getByRole("region", { name: "Test results" });

  // Wrong answer: the first failing example opens with Expected / Got.
  await setCode(page, `def ${fn}(*args):\n    return None\n`);
  await run(page); // first run loads Python
  await expect(results.getByText(`0 of ${examples} examples passed`, { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(results.getByRole("button", { name: /Example 1\s*Failed/, expanded: true })).toBeVisible();
  await expect(results.getByText("Expected", { exact: true })).toBeVisible();
  await expect(results.getByText("Got", { exact: true })).toBeVisible();
  await expect(results.getByText("None", { exact: true })).toBeVisible();

  // Syntax error: an error card naming the line. Notices are also announced through a
  // screen-reader-only live line, so .last() is the visible card.
  await setCode(page, `def ${fn}(*args):\n    x = [1, 2\n    return x\n`);
  await run(page);
  await expect(results.getByText(/^SyntaxError on line 2\b/).last()).toBeVisible();

  // Infinite loop: stopped by the 5 s watchdog, and the editor still works.
  await setCode(page, `def ${fn}(*args):\n    while True:\n        pass\n`);
  await run(page);
  await expect(results.getByText(/^Stopped after 5 seconds/).last()).toBeVisible({ timeout: 10_000 });
  await expect(editor(page)).toBeEditable();
  await setCode(page, problem.referenceSolution);
  await run(page); // waits out the fresh Python worker's load
  await expect(results.getByText(`${examples} of ${examples} examples passed`, { exact: true })).toBeVisible({ timeout: 60_000 });
});
