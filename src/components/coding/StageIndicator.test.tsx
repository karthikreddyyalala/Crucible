import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StageIndicator } from "./StageIndicator";

describe("StageIndicator", () => {
  it("tells screen readers where the interview is", () => {
    const { rerender } = render(<StageIndicator stage="approach" />);
    expect(screen.getByText("Stage 1 of 3: Approach")).toBeInTheDocument();
    rerender(<StageIndicator stage="coding" />);
    expect(screen.getByText("Stage 2 of 3: Code")).toBeInTheDocument();
    rerender(<StageIndicator stage="review" />);
    expect(screen.getByText("Stage 3 of 3: Review")).toBeInTheDocument();
  });

  it("has nothing to click", () => {
    render(<StageIndicator stage="coding" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
