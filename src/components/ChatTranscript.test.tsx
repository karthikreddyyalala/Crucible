import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ChatMessage } from "@/stores/sessionStore";
import { ChatTranscript } from "./ChatTranscript";

const messages: ChatMessage[] = [
  { id: "m1", speaker: "interviewer", kind: "question", text: "Walk me through your approach.", questionId: "q1" },
];

describe("ChatTranscript", () => {
  it("announces new lines politely as a log", () => {
    render(<ChatTranscript messages={messages} thinking={false} />);
    const log = screen.getByRole("log", { name: "Conversation with Marcus" });
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveAttribute("aria-relevant", "additions");
    expect(log).toHaveTextContent("Walk me through your approach.");
  });

  it("stays silent while the voice reads the lines aloud, so nothing is heard twice", () => {
    render(<ChatTranscript messages={messages} thinking={false} live={false} />);
    expect(screen.getByRole("log")).toHaveAttribute("aria-live", "off");
  });

  it("doesn't read the whole inserted problem aloud when it appears", () => {
    render(<ChatTranscript messages={messages} thinking={false} inset={<p>Problem</p>} insetBefore="m1" />);
    expect(screen.getByText("Problem").parentElement).toHaveAttribute("aria-live", "off");
  });
});
