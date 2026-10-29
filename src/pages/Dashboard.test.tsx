import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Dashboard, deltaLabel } from "./Dashboard";
import type { MemoryProfile, SessionSummary } from "@/types/contracts";

vi.mock("@/lib/api", () => ({ api: { getMemory: vi.fn(), listSessions: vi.fn() } }));
vi.mock("@/lib/identity", () => ({ getCandidateId: () => "c" }));

const PROFILE: MemoryProfile = {
  candidateId: "c",
  recurringWeaknesses: [
    { tag: "rambling", frequency: 4, lastSeen: "2026-10-01" },
    { tag: "vague-impact", frequency: 3, lastSeen: "2026-10-03" },
  ],
  improvementTrend: [
    { sessionDate: "2026-10-01", avgScore: 2.4 },
    { sessionDate: "2026-10-02", avgScore: 2.9 },
    { sessionDate: "2026-10-03", avgScore: 3.3 },
  ],
  strongAreas: ["clear_structure"],
};

const SESSIONS: SessionSummary[] = [
  { sessionId: "s3", date: "2026-10-03", mode: "behavioral", level: "mid", survived: 3, total: 5, weaknessTags: ["vague-impact"] },
  { sessionId: "s2", date: "2026-10-02", mode: "behavioral", level: "mid", survived: 2, total: 5, weaknessTags: ["vague-impact"] },
  { sessionId: "s1", date: "2026-10-01", mode: "full", level: "mid", survived: 1, total: 4, weaknessTags: ["rambling"] },
];

async function mocked() {
  const { api } = await import("@/lib/api");
  return vi.mocked(api);
}

function renderPage() {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  const api = await mocked();
  api.getMemory.mockReset();
  api.listSessions.mockReset();
});

describe("Dashboard", () => {
  it("opens with the takeaway and shows weak spots humanized, ordered, with dot history", async () => {
    const api = await mocked();
    api.getMemory.mockResolvedValue(PROFILE);
    api.listSessions.mockResolvedValue(SESSIONS);
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "You held up on 3 of 5 answers last session. Vague impact is the next thing to work on.",
      }),
    ).toBeInTheDocument();

    const items = screen.getAllByRole("listitem").filter((li) => /Vague impact|Rambling/.test(li.textContent ?? ""));
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("Still showing up"),
      expect.stringContaining("Looks fixed"),
    ]);
    expect(screen.getByRole("img", { name: "Showed up in 2 of your last 3 sessions" })).toBeInTheDocument();
    expect(screen.getByText("Clear structure")).toBeInTheDocument();
    expect(screen.queryByText("vague-impact")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /oldest first, out of 5: 2.4, 2.9, 3.3/ })).toBeInTheDocument();
    expect(screen.getByText("3.3 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start your next interview/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Coding" })).not.toBeInTheDocument();
  });

  it("shows coding attempts with problem titles when a session has them", async () => {
    const api = await mocked();
    api.getMemory.mockResolvedValue(PROFILE);
    api.listSessions.mockResolvedValue([
      {
        ...SESSIONS[0],
        coding: [
          { questionId: "q1", problemId: "code-two-sum", language: "python", testsPassed: 14, testsTotal: 14, submitted: true, seconds: 660 },
          { questionId: "q2", problemId: "code-valid-anagram", language: "javascript", testsPassed: 3, testsTotal: 8, submitted: false, seconds: null },
        ],
      },
      ...SESSIONS.slice(1),
    ]);
    renderPage();

    const section = (await screen.findByRole("heading", { name: "Coding" })).closest("section");
    expect(section).toHaveTextContent("You've solved 1 of 2 problems. Fastest: Two Sum in 11 min.");
    const rows = within(section as HTMLElement).getAllByRole("listitem");
    expect(rows.map((li) => li.textContent)).toEqual([
      expect.stringMatching(/Valid Anagram.*JavaScript.*Not submitted/),
      expect.stringMatching(/Two Sum.*Python.*11 min.*14 of 14 tests/),
    ]);
  });

  it("uses a shorter chart for fewer than 3 points", async () => {
    const api = await mocked();
    api.getMemory.mockResolvedValue({ ...PROFILE, improvementTrend: PROFILE.improvementTrend.slice(0, 2) });
    api.listSessions.mockResolvedValue(SESSIONS.slice(0, 2));
    renderPage();
    const chart = await screen.findByRole("img", { name: /oldest first/ });
    expect(chart.getAttribute("viewBox")).toBe("0 0 560 120");
  });

  it("says what will appear when there are no sessions, with one action", async () => {
    const api = await mocked();
    api.getMemory.mockResolvedValue({ ...PROFILE, recurringWeaknesses: [], improvementTrend: [], strongAreas: [] });
    api.listSessions.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole("heading", { name: "No sessions yet." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start your first interview/ })).toBeInTheDocument();
  });

  it("explains a load failure in plain words and retries", async () => {
    const api = await mocked();
    api.getMemory.mockRejectedValueOnce(new Error("Request failed (502)")).mockResolvedValue(PROFILE);
    api.listSessions.mockResolvedValue(SESSIONS);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your progress.");
    expect(screen.queryByText(/502/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Next to work on" })).toBeInTheDocument();
    expect(api.getMemory).toHaveBeenCalledTimes(2);
  });
});

describe("deltaLabel", () => {
  it("says No change when the shown number would be zero", () => {
    expect(deltaLabel(0)).toBe("No change");
    expect(deltaLabel(0.04)).toBe("No change");
    expect(deltaLabel(-0.04)).toBe("No change");
    expect(deltaLabel(0.4)).toBe("+0.4");
    expect(deltaLabel(-0.5)).toBe("-0.5");
  });
});
