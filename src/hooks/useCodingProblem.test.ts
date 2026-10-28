import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { api } from "@/lib/api";
import { useCodingProblem } from "./useCodingProblem";
import type { PublicProblem } from "@/lib/coding/types";

const problem = { id: "code-a", title: "A", starterCode: "def a():\n    pass\n" } as PublicProblem;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useCodingProblem", () => {
  it("loads a problem, then serves the same id from the cache", async () => {
    const get = vi.spyOn(api, "getProblem").mockResolvedValue(problem);
    const first = renderHook(() => useCodingProblem("code-a"));
    expect(first.result.current.status).toBe("loading");
    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    expect(first.result.current.problem).toBe(problem);

    const second = renderHook(() => useCodingProblem("code-a"));
    await waitFor(() => expect(second.result.current.status).toBe("ready"));
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("reports an error and loads again on retry", async () => {
    const get = vi.spyOn(api, "getProblem").mockRejectedValueOnce(new Error("offline")).mockResolvedValue(problem);
    const { result } = renderHook(() => useCodingProblem("code-b"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.problem).toBeNull();

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("is an error without a problem id", () => {
    const { result } = renderHook(() => useCodingProblem(null));
    expect(result.current.status).toBe("error");
  });
});
