import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Setup } from "./Setup";

vi.mock("@/lib/pdf", () => ({ extractPdfText: vi.fn() }));

function renderSetup() {
  render(<MemoryRouter><Setup /></MemoryRouter>);
}

describe("Setup — accessible pickers", () => {
  it.each(["TARGET ROLE", "INTERVIEW MODE", "LEVEL", "COMPANY STYLE"])(
    "%s is a labelled group with exactly one pressed choice",
    (name) => {
      renderSetup();
      const buttons = within(screen.getByRole("group", { name })).getAllByRole("button");
      expect(buttons.every((b) => b.hasAttribute("aria-pressed"))).toBe(true);
      expect(buttons.filter((b) => b.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    },
  );

  it("offers Coding and the company styles, General first and selected", async () => {
    renderSetup();
    const mode = within(screen.getByRole("group", { name: "INTERVIEW MODE" }));
    await userEvent.click(mode.getByRole("button", { name: "Coding" }));
    expect(screen.getByText("Live coding in Python — problems from the Blind 75.")).toBeInTheDocument();

    const styles = within(screen.getByRole("group", { name: "COMPANY STYLE" })).getAllByRole("button");
    expect(styles[0]).toHaveTextContent("General");
    expect(styles[0]).toHaveAttribute("aria-pressed", "true");
    const amazon = styles.find((b) => b.textContent?.startsWith("Amazon-style"))!;
    await userEvent.click(amazon);
    expect(amazon).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Crucible isn't affiliated with these companies.")).toBeInTheDocument();
  });

  it("labels the name, resume and job description fields", () => {
    renderSetup();
    expect(screen.getByLabelText("YOUR NAME").tagName).toBe("INPUT");
    // The server rejects longer names; stop at the same limit instead.
    expect(screen.getByLabelText("YOUR NAME")).toHaveAttribute("maxLength", "80");
    expect(screen.getByLabelText("YOUR RESUME").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("JOB DESCRIPTION").tagName).toBe("TEXTAREA");
  });

  it("gives every control a visible keyboard focus ring", () => {
    renderSetup();
    const controls = [...document.querySelectorAll("main button, main input:not([type=file]), main textarea")];
    expect(controls.length).toBeGreaterThan(10);
    for (const c of controls) expect(c.className, c.outerHTML.slice(0, 80)).toContain("focus-visible:ring-2");
  });
});
