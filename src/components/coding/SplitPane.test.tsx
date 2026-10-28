import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SplitPane, clampPct } from "./SplitPane";

const KEY = "test.split";

function setup(axis: "x" | "y" = "x") {
  return render(
    <SplitPane
      axis={axis}
      storageKey={KEY}
      defaultPct={40}
      minFirst={360}
      minSecond={480}
      label="Resize panes"
      first={<div>left</div>}
      second={<div>right</div>}
    />,
  );
}

beforeEach(() => localStorage.clear());

describe("clampPct", () => {
  it("keeps both panes above their minimum size", () => {
    expect(clampPct(10, 1200, 360, 480)).toBe(30);
    expect(clampPct(90, 1200, 360, 480)).toBe(60);
    expect(clampPct(45, 1200, 360, 480)).toBe(45);
  });

  it("falls back to 0-100 when the container hasn't been measured", () => {
    expect(clampPct(120, 0, 360, 480)).toBe(100);
  });
});

describe("SplitPane", () => {
  it("is a focusable separator that reports its position", () => {
    setup();
    const divider = screen.getByRole("separator", { name: "Resize panes" });
    expect(divider).toHaveAttribute("aria-valuenow", "40");
    expect(divider).toHaveAttribute("aria-orientation", "vertical");
    expect(divider).toHaveAttribute("tabindex", "0");
  });

  it("moves 5% per arrow key and remembers the size", () => {
    const { unmount } = setup();
    const divider = screen.getByRole("separator");
    fireEvent.keyDown(divider, { key: "ArrowRight" });
    fireEvent.keyDown(divider, { key: "ArrowRight" });
    fireEvent.keyDown(divider, { key: "ArrowLeft" });
    expect(divider).toHaveAttribute("aria-valuenow", "45");
    fireEvent.keyDown(divider, { key: "ArrowDown" }); // wrong axis: ignored
    expect(divider).toHaveAttribute("aria-valuenow", "45");
    unmount();

    setup();
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "45");
  });

  it("uses up and down for a horizontal divider", () => {
    setup("y");
    const divider = screen.getByRole("separator");
    expect(divider).toHaveAttribute("aria-orientation", "horizontal");
    fireEvent.keyDown(divider, { key: "ArrowUp" });
    expect(divider).toHaveAttribute("aria-valuenow", "35");
  });

  it("resets to the default on double-click", () => {
    setup();
    const divider = screen.getByRole("separator");
    fireEvent.keyDown(divider, { key: "ArrowRight" });
    fireEvent.doubleClick(divider);
    expect(divider).toHaveAttribute("aria-valuenow", "40");
    expect(localStorage.getItem(KEY)).toBe("40");
  });

  it("ignores a corrupt stored size", () => {
    localStorage.setItem(KEY, "not a number");
    setup();
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "40");
  });
});
