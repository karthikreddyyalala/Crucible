import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionReview } from "./SessionReview";
import type { SessionRecord } from "@/types/contracts";

const RECORD: SessionRecord = {
  sessionId: "s1", candidateId: "c", date: "2026-10-28", mode: "coding", level: "mid",
  questions: [], evaluations: [], costUsd: 0,
};

vi.mock("@/lib/api", () => ({ api: { getSession: vi.fn() } }));
vi.mock("@/lib/identity", () => ({ getCandidateId: () => "c" }));

async function showRecord(record: SessionRecord) {
  const { api } = await import("@/lib/api");
  vi.mocked(api.getSession).mockResolvedValueOnce(record);
  render(
    <MemoryRouter initialEntries={["/session/s1"]}>
      <Routes><Route path="/session/:id" element={<SessionReview />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByText("Coding");
}

describe("SessionReview chips", () => {
  it("shows the company style and an early end", async () => {
    await showRecord({ ...RECORD, companyStyle: "amazon", endedForConduct: true });
    expect(screen.getByText("Amazon-style")).toBeInTheDocument();
    expect(screen.getByText("Ended early")).toBeInTheDocument();
  });

  it("shows neither for an older record", async () => {
    await showRecord(RECORD);
    expect(screen.queryByText("Ended early")).not.toBeInTheDocument();
    expect(screen.queryByText(/-style$/)).not.toBeInTheDocument();
  });
});
