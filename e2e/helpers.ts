import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

const RESUME = `Karthik Reddy — Backend Engineer, Brightwell Payments (2021–present)
- Moved card authorization off a Java monolith to Go services on Kubernetes; p99 fell from 900 ms to 180 ms.
- Built a Kafka ledger pipeline at 40k events/sec with idempotent consumers.
- Primary on-call for checkout; wrote 6 postmortems and added SLO-based alerting.
Skills: Go, Python, Kafka, PostgreSQL, Redis, Terraform.`;

const JD = `Software Engineer, Payments Platform. You will build and operate event-driven services that move money,
own their reliability on-call, and reason clearly about consistency, idempotency and failure modes.`;

interface Message {
  id: string;
  speaker: "interviewer" | "candidate";
  text: string;
}

export interface Session {
  status: string;
  phase: string;
  mode: string;
  level: string;
  companyStyle: string;
  strikes: number;
  currentIdx: number;
  followUpCount: number;
  codingStage: string;
  messages: Message[];
  plan: { questions: { id: string; type: string; exemplarId?: string }[] } | null;
}

/** The persisted session store (zustand persist, key "crucible.session.v1"). */
export async function session(page: Page): Promise<Session> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("crucible.session.v1") ?? "{}").state ?? {});
}

/** Fills Setup and starts a demo session; resolves on the interview page with Marcus's greeting shown. */
export async function startSession(
  page: Page,
  { mode, level = "Mid", companyStyle }: { mode: string; level?: string; companyStyle?: RegExp },
): Promise<void> {
  await page.goto("/setup");
  await page.evaluate(() => localStorage.clear());
  await page.getByLabel("Your name").fill("Karthik Reddy");
  await page.getByRole("group", { name: "Interview mode" }).getByRole("button", { name: mode, exact: true }).click();
  await page.getByRole("group", { name: "Level" }).getByRole("button", { name: level, exact: true }).click();
  if (companyStyle) await page.getByRole("group", { name: "Company style" }).getByRole("button", { name: companyStyle }).click();
  await page.getByLabel("Your resume").fill(RESUME);
  await page.getByLabel("Job description").fill(JD);
  await page.getByRole("button", { name: "Begin interview" }).click();
  await page.waitForURL("**/interview");
  await expect(page.getByText("Hi Karthik, I'm Marcus")).toBeVisible();
}

/** Sends one answer and waits for Marcus's reply; returns its text. */
export async function say(page: Page, text: string): Promise<string> {
  const box = page.getByRole("textbox", { name: "Your answer" });
  await expect(box).toBeEnabled();
  const before = (await session(page)).messages.at(-1)?.id;
  await box.fill(text);
  await box.press("ControlOrMeta+Enter");
  // The reply is in once the newest message is a new interviewer line (the store
  // never persists "thinking", so the message list is the signal).
  let reply = "";
  await expect
    .poll(async () => {
      const last = (await session(page)).messages.at(-1);
      reply = last?.speaker === "interviewer" && last.id !== before ? last.text : "";
      return reply;
    }, { timeout: 15_000 })
    .not.toBe("");
  await expect(page.getByText(reply, { exact: true }).last()).toBeVisible();
  return reply;
}

/** Small talk, then background: lands on the first planned question. */
export async function getToFirstQuestion(page: Page): Promise<string> {
  await say(page, "Doing well, thanks. Looking forward to this.");
  return say(
    page,
    "I've spent four years at Brightwell Payments building Go services and a Kafka ledger pipeline; most recently I led the migration off our Java monolith.",
  );
}

export interface Problem {
  title: string;
  functionName: string;
  referenceSolution: string;
  visibleTestCount: number;
  tests: unknown[];
}

/** The current coding question's problem, read from the backend's problem file. */
export async function currentProblem(page: Page): Promise<Problem> {
  const s = await session(page);
  const id = s.plan?.questions[s.currentIdx]?.exemplarId;
  expect(id, "current question has a coding problem").toBeTruthy();
  return JSON.parse(readFileSync(new URL(`../backend/data/coding/problems/${id}.json`, import.meta.url), "utf8"));
}

/** The CodeMirror editor (its content element is role=textbox). */
export const editor = (page: Page) => page.getByRole("textbox", { name: "Python code editor" });

/** Replaces the editor's whole document as if typed. */
export async function setCode(page: Page, code: string): Promise<void> {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(code);
}

/** Clicks Run once Python is idle or ready (not loading or mid-run). */
export async function run(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: "Run", exact: true });
  await expect(button).toBeEnabled({ timeout: 60_000 });
  await button.click();
}
