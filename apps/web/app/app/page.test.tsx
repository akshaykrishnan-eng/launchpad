import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { redirect, getCurrentUser } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getCurrentUser: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));

import ProtectedAppPage from "./page";

describe("ProtectedAppPage", () => {
  it("redirects to /login when there is no authenticated user", async () => {
    getCurrentUser.mockResolvedValue(null);

    await expect(ProtectedAppPage()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders the user's email and roles when authenticated", async () => {
    getCurrentUser.mockResolvedValue({
      id: "1",
      email: "user@example.com",
      roles: ["CANDIDATE"],
      is_active: true,
    });

    const ui = await ProtectedAppPage();
    render(ui);

    expect(screen.getByText("Ellow Launchpad")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("CANDIDATE")).toBeInTheDocument();
  });
});
