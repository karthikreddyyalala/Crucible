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
  });

  it("sends neither for other questions", async () => {
    const api = await realApi();
    fetchMock.mockResolvedValueOnce(json({ modelAnswer: "m", improvements: [] }));
    await api.coachAnswer({ question: behavioral, transcript: "t", weaknessTags: [], sessionId: "s1", code: "x" });
    expect(sentBody()).not.toHaveProperty("code");
    expect(sentBody()).not.toHaveProperty("sessionId");
  });
});
