import { expect, test } from "@playwright/test";
import { currentProblem, editor, getToFirstQuestion, session, setCode, startSession } from "./helpers";

test("code and the coding question survive a reload", async ({ page }) => {
  await startSession(page, { mode: "Coding", level: "Junior" });
  await getToFirstQuestion(page);
  const problem = await currentProblem(page);
  const code = `def ${problem.functionName}(*args):\n    # half-way through: try a hash map\n    return None\n`;
  await setCode(page, code);
  await expect(editor(page)).toContainText("half-way through: try a hash map");

  const before = await session(page);
  await page.reload();

  await expect(page.getByText("SESSION RESTORED")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: problem.title, exact: true })).toBeVisible();
  await expect(editor(page)).toContainText("half-way through: try a hash map");
  const after = await session(page);
  expect(after.phase).toBe("question");
  expect(after.currentIdx).toBe(before.currentIdx);
  expect(after.codingStage).toBe("coding");
});
