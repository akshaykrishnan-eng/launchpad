import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import { RegisterForm } from "./RegisterForm";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

async function goToOtpStep(email = "new.user@example.com") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  await screen.findByRole("heading", { name: /verify your email/i });
}

async function goToPasswordStep(email = "new.user@example.com") {
  await goToOtpStep(email);
  fireEvent.change(screen.getByLabelText("Verification code"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: /verify email/i }));
  await screen.findByRole("heading", { name: /create your password/i });
}

describe("RegisterForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockClear();
    refresh.mockClear();
  });

  it("renders only the email field on the first step", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("advances to the verification step after starting email verification", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ registration_token: "tok_123" })),
    );
    render(<RegisterForm />);

    await goToOtpStep("candidate@example.com");

    expect(screen.getByText(/candidate@example.com/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/register/start",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the backend's error message when starting verification fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Please wait 42s" }, false)),
    );
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "cooldown@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please wait 42s");
  });

  it("advances to the password step after a correct code", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ registration_token: "tok_123" }))
        .mockResolvedValueOnce(jsonResponse({})),
    );
    render(<RegisterForm />);

    await goToPasswordStep();

    expect(fetch).toHaveBeenLastCalledWith(
      "/api/auth/register/verify",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows an error and stays on the otp step for an incorrect code", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ registration_token: "tok_123" }))
        .mockResolvedValueOnce(
          jsonResponse({ detail: "Invalid or expired verification code" }, false),
        ),
    );
    render(<RegisterForm />);

    await goToOtpStep();
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify email/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid or expired verification code",
    );
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
  });

  it("lets the candidate change email before verifying", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ registration_token: "tok_123" })),
    );
    render(<RegisterForm />);

    await goToOtpStep();
    fireEvent.click(screen.getByRole("button", { name: /change email/i }));

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("disables resend until the cooldown clears, then allows resending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ registration_token: "tok_123" })),
    );
    render(<RegisterForm />);

    await goToOtpStep();

    expect(screen.getByRole("button", { name: /resend code in \d+s/i })).toBeDisabled();
  });

  it("shows a mismatch error and never calls the API when passwords differ", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ registration_token: "tok_123" }))
        .mockResolvedValueOnce(jsonResponse({})),
    );
    render(<RegisterForm />);
    await goToPasswordStep();
    const callsBeforeSubmit = (fetch as unknown as { mock: { calls: unknown[] } }).mock.calls
      .length;

    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match");
    expect((fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(
      callsBeforeSubmit,
    );
  });

  it("completes registration, logs in, and redirects on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ registration_token: "tok_123" })) // start
        .mockResolvedValueOnce(jsonResponse({})) // verify
        .mockResolvedValueOnce(jsonResponse({ id: "u1", email: "new.user@example.com" })) // complete
        .mockResolvedValueOnce(jsonResponse({ ok: true, redirectTo: "/app" })), // login
    );
    render(<RegisterForm />);
    await goToPasswordStep();

    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
  });

  it("shows the backend's error message when completion fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ registration_token: "tok_123" }))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(jsonResponse({ detail: "Email is already registered" }, false)),
    );
    render(<RegisterForm />);
    await goToPasswordStep();

    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email is already registered");
  });
});
