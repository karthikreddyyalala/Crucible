import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Login } from "./Login";
import { authApi } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  authApi: {
    configured: true,
    signIn: vi.fn(),
    signUp: vi.fn(),
    confirm: vi.fn(),
    resendCode: vi.fn(),
    forgotPassword: vi.fn(),
    confirmForgotPassword: vi.fn(),
    getSession: vi.fn(async () => null),
    signOut: vi.fn(),
  },
}));

const named = (name: string) => Object.assign(new Error("raw provider text"), { name });

function renderLogin() {
  render(<MemoryRouter><Login /></MemoryRouter>);
}

async function fillSignIn() {
  await userEvent.type(screen.getByLabelText("EMAIL"), "maya@example.com");
  await userEvent.type(screen.getByLabelText("PASSWORD"), "Secret123{Enter}");
}

describe("Login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("labels its fields and submits on Enter", async () => {
    renderLogin();
    expect(screen.getByLabelText("EMAIL")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("PASSWORD")).toHaveAttribute("autocomplete", "current-password");
    await fillSignIn();
    expect(authApi.signIn).toHaveBeenCalledWith("maya@example.com", "Secret123");
  });

  it("a wrong password offers the reset as the fix", async () => {
    vi.mocked(authApi.signIn).mockRejectedValueOnce(named("NotAuthorizedException"));
    renderLogin();
    await fillSignIn();
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    await userEvent.click(screen.getByRole("button", { name: "Reset your password" }));
    expect(screen.getByRole("heading", { name: "Reset your password" })).toBeInTheDocument();
  });

  it("never shows a raw provider message", async () => {
    vi.mocked(authApi.signIn).mockRejectedValueOnce(named("SomethingOdd"));
    renderLogin();
    await fillSignIn();
    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("raw provider text");
    expect(alert).toHaveTextContent("Check your connection and try again.");
  });

  it("confirms when a new verification code is sent", async () => {
    vi.mocked(authApi.signUp).mockResolvedValueOnce({ needsConfirm: true });
    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: "Create one" }));
    await fillSignIn();
    expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resend code" }));
    expect(authApi.resendCode).toHaveBeenCalledWith("maya@example.com");
    expect(await screen.findByText("A new code is on its way to maya@example.com.")).toBeInTheDocument();
  });
});
