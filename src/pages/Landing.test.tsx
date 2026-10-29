import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Landing } from "./Landing";

// jsdom has no IntersectionObserver; Reveal's whileInView needs one to mount.
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe("Landing", () => {
  it("starts an interview through a single link, never a button inside a link", () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    const ctas = screen.getAllByRole("link", { name: /Start (an|your first) interview/ });
    expect(ctas.length).toBe(3);
    for (const a of ctas) {
      expect(a).toHaveAttribute("href", "/setup");
      expect(a.querySelector("button")).toBeNull();
    }
  });

  it("offers a way to your progress and the privacy page", () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getAllByRole("link", { name: "Your progress" })[0]).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Privacy & terms" })).toHaveAttribute("href", "/privacy");
  });

  it("hides the secondary nav links on phones (no display class fighting `hidden`)", () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    const nav = screen.getByRole("navigation", { name: "Main" });
    for (const name of ["How it works", "Your progress"]) {
      const classes = within(nav).getByRole("link", { name }).className.split(/\s+/);
      expect(classes).toContain("hidden");
      expect(classes).not.toContain("inline-flex");
    }
  });

  it("lists coding among the kinds of round", () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 3, name: "Coding" })).toBeInTheDocument();
  });
});
