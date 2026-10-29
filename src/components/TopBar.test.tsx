import { type ReactNode } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TopBar } from "./TopBar";

const at = (path: string, right?: ReactNode) =>
  render(<MemoryRouter initialEntries={[path]}><TopBar right={right} /></MemoryRouter>);

describe("TopBar", () => {
  it("links to your progress from other pages", () => {
    at("/setup");
    expect(screen.getByRole("link", { name: "Your progress" })).toHaveAttribute("href", "/dashboard");
  });

  it("hides the progress link on the dashboard and when a page owns the right slot", () => {
    at("/dashboard");
    expect(screen.queryByRole("link", { name: "Your progress" })).toBeNull();
    cleanup();
    at("/interview", <span>live</span>);
    expect(screen.queryByRole("link", { name: "Your progress" })).toBeNull();
  });
});
