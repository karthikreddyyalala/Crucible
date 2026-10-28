import { expect, test } from "@playwright/test";
import { currentProblem, editor, getToFirstQuestion, startSession } from "./helpers";

test.use({ viewport: { width: 390, height: 844 } });

test("a coding question on a phone: problem and a notice, no editor", async ({ page }) => {
  await startSession(page, { mode: "Coding", level: "Junior" });
  await getToFirstQuestion(page);

  const problem = await currentProblem(page);
  await expect(page.getByRole("heading", { level: 1, name: problem.title, exact: true })).toBeVisible();
  await expect(page.getByText("The code editor needs a larger screen")).toBeVisible();
  await expect(editor(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Run", exact: true })).toHaveCount(0);
});
