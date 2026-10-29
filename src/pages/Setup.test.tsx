import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Setup, whatsMissing } from "./Setup";
import { useSessionStore } from "@/stores/sessionStore";

vi.mock("@/lib/pdf", () => ({ extractPdfText: vi.fn() }));

function renderSetup() {
  render(<MemoryRouter><Setup /></MemoryRouter>);
}

const openMoreOptions = () => userEvent.click(screen.getByRole("button", { name: /More options/ }));

describe("Setup — accessible pickers", () => {
  it.each(["TARGET ROLE", "INTERVIEW MODE", "LEVEL", "COMPANY STYLE"])(
    "%s is a labelled group with exactly one pressed choice",
    async (name) => {
      renderSetup();
      await openMoreOptions();
      const buttons = within(screen.getByRole("group", { name })).getAllByRole("button");
      expect(buttons.every((b) => b.hasAttribute("aria-pressed"))).toBe(true);
      expect(buttons.filter((b) => b.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    },
  );

  it("offers Coding and the company styles, General first and selected", async () => {
    renderSetup();
    const mode = within(screen.getByRole("group", { name: "INTERVIEW MODE" }));
    await userEvent.click(mode.getByRole("button", { name: "Coding" }));
    expect(screen.getByText("Live coding in Python or JavaScript with problems from the Blind 75.")).toBeInTheDocument();

    await openMoreOptions();

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

  it("gives every control a visible keyboard focus ring", async () => {
    renderSetup();
    await openMoreOptions();
    const controls = [...document.querySelectorAll("main button, main input:not([type=file]), main textarea")];
    expect(controls.length).toBeGreaterThan(10);
    for (const c of controls) expect(c.className, c.outerHTML.slice(0, 80)).toContain("focus-visible:ring-2");
  });
});

describe("Setup — order and disclosure", () => {
  it("puts the resume and job description right after name and role", () => {
    renderSetup();
    const order = ["YOUR NAME", "YOUR RESUME", "JOB DESCRIPTION"].map((l) => screen.getByLabelText(l));
    const role = screen.getByRole("group", { name: "TARGET ROLE" });
    const mode = screen.getByRole("group", { name: "INTERVIEW MODE" });
    const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(order[0], role)).toBe(true);
    expect(follows(role, order[1])).toBe(true);
    expect(follows(order[2], mode)).toBe(true);
  });

  it("keeps company style and video behind More options, closed by default and keyboard-operable", async () => {
    renderSetup();
    const more = screen.getByRole("button", { name: /More options/ });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("group", { name: "COMPANY STYLE" })).not.toBeInTheDocument();
    more.focus();
    await userEvent.keyboard("{Enter}");
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: "COMPANY STYLE" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Live video interviewer/ })).toBeInTheDocument();
  });

  it("names modes in sentence case and styles the chosen level like every other choice", () => {
    renderSetup();
    const mode = within(screen.getByRole("group", { name: "INTERVIEW MODE" }));
    expect(mode.getByRole("button", { name: "Full mock" })).toBeInTheDocument();
    expect(mode.getByRole("button", { name: "System design" })).toBeInTheDocument();
    const mid = within(screen.getByRole("group", { name: "LEVEL" })).getByRole("button", { name: "Mid" });
    expect(mid.className).toContain("border-accent bg-accent/10 text-chalk");
  });
});

describe("Setup — preventing and recovering from a bad start", () => {
  const begin = () => screen.getByRole("button", { name: /Begin interview/ });

  it("keeps Begin off and says exactly what is missing", async () => {
    renderSetup();
    expect(begin()).toBeDisabled();
    expect(begin()).toHaveAccessibleDescription(
      "Add your resume, or use the sample. Add the job description, or use the sample.",
    );
    const jd = within(screen.getByLabelText("JOB DESCRIPTION").parentElement!);
    await userEvent.click(jd.getByRole("button", { name: /Use sample/ }));
    expect(begin()).toHaveAccessibleDescription("Add your resume, or use the sample.");
    await userEvent.type(screen.getByLabelText("YOUR RESUME"), "Short resume");
    expect(begin()).toHaveAccessibleDescription("Your resume looks short. Paste the full text.");
  });

  it("says nothing is missing once both are long enough", () => {
    expect(whatsMissing("r".repeat(201), "j".repeat(101))).toBe("");
    expect(whatsMissing("r".repeat(201), "short")).toBe("The job description looks short. Paste all of it.");
  });

  it("asks before the sample replaces pasted text", async () => {
    renderSetup();
    const box = screen.getByLabelText("YOUR RESUME");
    await userEvent.type(box, "My own resume");
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    await userEvent.click(within(box.parentElement!).getByRole("button", { name: /Use sample/ }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(box).toHaveValue("My own resume");
    confirm.mockRestore();
  });

  it("explains a failed start and offers Try again", async () => {
    const start = vi.fn().mockRejectedValue(new Error("Couldn't reach the server. Check your connection and try again."));
    useSessionStore.setState({ start });
    renderSetup();
    for (const label of ["YOUR RESUME", "JOB DESCRIPTION"]) {
      await userEvent.click(within(screen.getByLabelText(label).parentElement!).getByRole("button", { name: /Use sample/ }));
    }
    await userEvent.click(begin());
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach the server.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(start).toHaveBeenCalledTimes(2);
  });
});
