import { expect, test } from "@playwright/test";
import { session, startSession } from "./helpers";

test("the company style picker shows on Setup and its choice reaches the session", async ({ page }) => {
  await page.goto("/setup");
  await page.getByRole("button", { name: /More options/ }).click();
  const picker = page.getByRole("group", { name: "Company style" });
  await expect(picker.getByRole("button", { name: /^General/ })).toHaveAttribute("aria-pressed", "true");
  await expect(picker.getByRole("button", { name: /^Amazon-style/ })).toBeVisible();
  await expect(page.getByText("Crucible isn't affiliated with these companies.")).toBeVisible();

  await startSession(page, { mode: "Behavioral", companyStyle: /^Amazon-style/ });
  expect((await session(page)).companyStyle).toBe("amazon");
});
