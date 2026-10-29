import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionReview } from "./SessionReview";
import type { SessionRecord } from "@/types/contracts";

const RECORD: SessionRecord = {
  sessionId: "s1", candidateId: "c", date: "2026-10-28", mode: "coding", level: "mid",
  questions: [], evaluations: [], costUsd: 0,
};

// jsdom has no IntersectionObserver; motion's in-view animations need one.
vi.stubGlobal("IntersectionObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
});

vi.mock("@/lib/api", () => ({ api: { getSession: vi.fn() } }));
vi.mock("@/lib/identity", () => ({ getCandidateId: () => "c" }));

function mount() {
  render(
    <MemoryRouter initialEntries={["/session/s1"]}>
      <Routes><Route path="/session/:id" element={<SessionReview />} /></Routes>
    </MemoryRouter>,
  );
}

async function showRecord(record: SessionRecord) {
  const { api } = await import("@/lib/api");
  vi.mocked(api.getSession).mockResolvedValueOnce(record);
  mount();
  await screen.findByText("Coding");
}

describe("SessionReview chips", () => {
  it("shows the company style and an early end", async () => {
    await showRecord({ ...RECORD, companyStyle: "amazon", endedForConduct: true });
    expect(screen.getByText("Amazon-style")).toBeInTheDocument();
    expect(screen.getByText("Ended early")).toBeInTheDocument();
  });

  it("shows the stored day (not the day before), the level as on the dashboard, and the way back", async () => {
    await showRecord(RECORD);
    expect(screen.getByText(/OCTOBER 28, 2026/)).toBeInTheDocument();
    expect(screen.getByText("mid")).toBeInTheDocument();
    expect(screen.queryByText(/level/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Your progress" })).toHaveAttribute("href", "/dashboard");
  });

  it("shows neither for an older record", async () => {
    await showRecord(RECORD);
    expect(screen.queryByText("Ended early")).not.toBeInTheDocument();
    expect(screen.queryByText(/-style$/)).not.toBeInTheDocument();
  });
});

describe("SessionReview states", () => {
  it("opens with the takeaway for a scored session", async () => {
    await showRecord({
      ...RECORD,
      questions: [{ id: "q1", type: "coding", prompt: "Two sum.", targetDifficulty: 2, weightedFromWeakness: false }],
      evaluations: [{
        questionId: "q1", transcript: "", rubricScores: {}, weaknessTags: ["failing-tests"], followUpCount: 0,
        wouldSurviveRealInterview: false, survivalReasoning: "Fails example 2.",
      }],
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("You held up on 0 of 1 answer.");
    expect(screen.getByText("Failing tests is the next thing to work on.")).toBeInTheDocument();
  });

  it("says when nothing was scored and offers a new interview", async () => {
    await showRecord(RECORD);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("No answers were scored.");
    expect(screen.getByRole("link", { name: "Start your next interview" })).toHaveAttribute("href", "/setup");
  });

  it("explains a load failure in plain words and retries", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.getSession).mockRejectedValueOnce(new Error("HTTP 502 upstream"));
    mount();
    await screen.findByText("Couldn't load this session.");
    expect(screen.queryByText(/HTTP 502/)).not.toBeInTheDocument();
    vi.mocked(api.getSession).mockResolvedValueOnce(RECORD);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Coding");
  });
});
