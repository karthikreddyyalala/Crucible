import { expect, test } from "@playwright/test";
import { getToFirstQuestion, say, session, startSession } from "./helpers";

test("a behavioral session: intro, a vague answer gets probed, a concrete one moves on", async ({ page }) => {
  await startSession(page, { mode: "Behavioral" });

  const first = await getToFirstQuestion(page);
  expect(first).toMatch(/Tell me about a time you owned a project end-to-end/);
  await expect(page.getByText("Q1 / 2")).toBeVisible();

  const probe = await say(page, "We just shipped it on time, it went fine.");
  expect(probe).toMatch(/What did you personally do there/);
  await expect(page.getByText("MARCUS · FOLLOW-UP")).toBeVisible();
  await expect(page.getByText("FOLLOW-UP 1", { exact: true })).toBeVisible();

  const next = await say(
    page,
    "I owned the checkout migration with a card-network deadline: three weeks for what we had scoped at six. " +
      "I cut scope to the two highest-volume flows, negotiated deferring refunds with the product lead, and paired on the slowest Go service. " +
      "We shipped on day 19, p99 dropped from 900 ms to 180 ms, and there were zero P1 incidents.",
  );
  expect(next).toMatch(/Describe a technical decision you pushed for/);
  await expect(page.getByText("Q2 / 2")).toBeVisible();
  expect((await session(page)).followUpCount).toBe(0);
});
