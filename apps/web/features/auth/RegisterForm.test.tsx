import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { RegisterForm } from "./RegisterForm";

function fillAndSubmit(password: string, confirmPassword: string) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "new.user@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: confirmPassword },
  });
  fireEvent.click(screen.getByRole("button", { name: /create account/i }));
}

describe("RegisterForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockClear();
  });

  it("renders email, password, and confirm password fields", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("shows an error and never calls the API when passwords do not match", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm />);

    fillAndSubmit("password123", "different123");

    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registers and redirects to /login on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    render(<RegisterForm />);

    fillAndSubmit("password123", "password123");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });

  it("shows the backend's error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Email is already registered" }),
      }),
    );
    render(<RegisterForm />);

    fillAndSubmit("password123", "password123");

    expect(await screen.findByRole("alert")).toHaveTextContent("Email is already registered");
  });
});
