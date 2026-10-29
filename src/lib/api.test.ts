import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PlannedQuestion } from "@/types/contracts";

// The real (non-demo) client: fetch is stubbed, auth has no session.
vi.mock("./auth", () => ({ authApi: { getSession: async () => null } }));

const coding: PlannedQuestion = {
  id: "q1", type: "coding", prompt: "Two sum.", targetDifficulty: 2, weightedFromWeakness: false, exemplarId: "code-two-sum",
};
const behavioral: PlannedQuestion = { ...coding, type: "behavioral", exemplarId: null };

async function realApi() {
  vi.stubEnv("VITE_USE_MOCK", "false");
  vi.resetModules();
  return (await import("./api")).api;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body as string);

describe("api.coachAnswer", () => {
  it("sends the session id and the final code (cut to 20,000 characters) for a coding answer", async () => {
    const api = await realApi();
    fetchMock.mockResolvedValueOnce(json({ modelAnswer: "m", improvements: [], code: "def f(): ..." }));
    await api.coachAnswer({ question: coding, transcript: "t", weaknessTags: [], sessionId: "s1", code: "x".repeat(25_000) });
    const body = sentBody();
    expect(body.sessionId).toBe("s1");
    expect(body.code).toHaveLength(20_000);
    expect(body.candidateId).toEqual(expect.any(String));
    expect(body.language).toBe("python");
  });

  it("sends the candidate's language for a coding answer", async () => {
    const api = await realApi();
    fetchMock.mockResolvedValueOnce(json({ modelAnswer: "m", improvements: [] }));
    await api.coachAnswer({ question: coding, transcript: "t", weaknessTags: [], sessionId: "s1", code: "x", language: "javascript" });
    expect(sentBody().language).toBe("javascript");
  });

  it("sends neither for other questions", async () => {
    const api = await realApi();
    fetchMock.mockResolvedValueOnce(json({ modelAnswer: "m", improvements: [] }));
    await api.coachAnswer({ question: behavioral, transcript: "t", weaknessTags: [], sessionId: "s1", code: "x" });
    expect(sentBody()).not.toHaveProperty("code");
    expect(sentBody()).not.toHaveProperty("sessionId");
  });
});

describe("request errors", () => {
  it("says the server couldn't be reached instead of the browser's \"Failed to fetch\"", async () => {
    const api = await realApi();
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(api.getProblem("code-two-sum")).rejects.toThrow("Couldn't reach the server");
  });

  it("hides a server crash's raw text behind a plain retry message", async () => {
    const api = await realApi();
    fetchMock.mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }));
    await expect(api.getProblem("code-two-sum")).rejects.toThrow("Something went wrong on our side");
  });

  it("shows a validation error's message instead of [object Object]", async () => {
    const api = await realApi();
    fetchMock.mockResolvedValueOnce(json({
      detail: [{ type: "string_too_long", loc: ["body", "answer"], msg: "String should have at most 40000 characters" }],
    }, 422));
    await expect(api.getProblem("code-two-sum")).rejects.toThrow("String should have at most 40000 characters");
  });

  it("keeps a plain detail string as it is", async () => {
    const api = await realApi();
    fetchMock.mockResolvedValueOnce(json({ detail: "Problem not found." }, 404));
    await expect(api.getProblem("nope")).rejects.toThrow("Problem not found.");
  });
});

describe("demo mode session history", () => {
  it("stores the coding attempts at finalize and returns them in the list and the record", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_USE_MOCK", "true");
    vi.resetModules();
    const { api } = await import("./api");
    localStorage.clear();
    const attempt = {
      questionId: "q1", problemId: "code-two-sum", language: "python" as const,
      testsPassed: 3, testsTotal: 3, submitted: true, seconds: 300,
    };
    const settle = async <T,>(p: Promise<T>): Promise<T> => {
      await vi.runAllTimersAsync();
      return p;
    };
    await settle(api.finalizeSession({
      candidateId: "demo", evaluations: [], sessionId: "s1", mode: "coding", level: "mid", questions: [coding],
      costUsd: 0, companyStyle: "general", endedForConduct: false, coding: [attempt],
    }));
    expect((await settle(api.listSessions("demo")))[0].coding).toEqual([attempt]);
    expect((await settle(api.getSession("demo", "s1")))?.coding).toEqual([attempt]);
    vi.useRealTimers();
  });
});
