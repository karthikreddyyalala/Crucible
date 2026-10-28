import { expect, test } from "@playwright/test";
import { say, session, startSession } from "./helpers";

test("three abusive messages: warning, final warning, then the interview ends", async ({ page }) => {
  await startSession(page, { mode: "Behavioral" });

  expect(await say(page, "you're an idiot")).toMatch(/^Let's keep this professional\./);
  expect(await say(page, "stfu")).toMatch(/if that happens again, I'll have to end the interview/);
  expect(await say(page, "fuck you")).toBe("I'm going to end the interview here. Take care.");
  // Struck lines leave the transcript.
  await expect(page.getByText("you're an idiot", { exact: true })).toHaveCount(0);

  await page.waitForURL("**/results");
  await expect(page.getByRole("heading", { name: "Interview ended early." })).toBeVisible();
  await expect(page.getByText("This session ended early because of the conduct of the conversation.")).toBeVisible();
});

test("casual swearing is not a strike", async ({ page }) => {
  await startSession(page, { mode: "Behavioral" });

  const reply = await say(page, "damn, I forgot the base case");
  expect(reply).not.toMatch(/professional|end the interview/);
  await expect(page.getByText("damn, I forgot the base case", { exact: true })).toBeVisible();
  const s = await session(page);
  expect(s.strikes).toBe(0);
  expect(s.phase).toBe("background");
});
