import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TavusCallOverlay } from "./TavusCallOverlay";

const props = {
  videoTrack: null,
  speaking: false,
  questionText: "Tell me about a conflict.",
  listening: false,
  draft: "",
  thinking: false,
  sttSupported: true,
  onToggleMic: vi.fn(),
  onSend: vi.fn(),
};

describe("TavusCallOverlay", () => {
  it("is a dialog that Escape minimizes", () => {
    const onClose = vi.fn();
    render(<TavusCallOverlay {...props} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Video call with Marcus" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("says what's happening in words", () => {
    const { rerender } = render(<TavusCallOverlay {...props} onClose={vi.fn()} thinking />);
    expect(screen.getByRole("status")).toHaveTextContent("Marcus is thinking…");
    rerender(<TavusCallOverlay {...props} onClose={vi.fn()} listening />);
    expect(screen.getByRole("status")).toHaveTextContent("Listening. Speak your answer.");
  });
});
