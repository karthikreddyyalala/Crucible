import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StageIndicator } from "./StageIndicator";

describe("StageIndicator", () => {
  it("says where the interview is in plain text", () => {
    const { container, rerender } = render(<StageIndicator stage="approach" />);
    expect(container).toHaveTextContent("Step 1 of 3: Approach");
    rerender(<StageIndicator stage="coding" />);
    expect(container).toHaveTextContent("Step 2 of 3: Code");
    rerender(<StageIndicator stage="review" />);
    expect(container).toHaveTextContent("Step 3 of 3: Review");
  });

  it("has nothing to click and no tab-like list", () => {
    render(<StageIndicator stage="coding" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
