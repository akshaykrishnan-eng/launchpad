import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import RegisterPage from "./page";

describe("RegisterPage", () => {
  it("renders the email-entry step of the registration flow", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });
});
