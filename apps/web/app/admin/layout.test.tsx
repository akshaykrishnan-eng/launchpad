import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect, getCurrentUser } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getCurrentUser: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/features/admin/AdminShell", () => ({
  AdminShell: ({ email, children }: { email: string | null; children: React.ReactNode }) => (
    <div data-testid="admin-shell" data-email={email ?? ""}>
      {children}
    </div>
  ),
}));

import AdminLayout from "./layout";

afterEach(() => {
  redirect.mockClear();
  getCurrentUser.mockClear();
});

// This gate is the actual security boundary's front door -- every
// other check happens server-side in FastAPI (require_admin), but a
// bug here would still mean a candidate briefly sees admin UI chrome
// before any API call 403s, which is worth catching directly.
describe("AdminLayout", () => {
  it("redirects to /login when there is no authenticated user", async () => {
    getCurrentUser.mockResolvedValue(null);

    await expect(AdminLayout({ params: Promise.resolve({}), children: <p>content</p> })).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redirects a plain CANDIDATE to /app", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", email: "candidate@example.com", roles: ["CANDIDATE"] });

    await expect(AdminLayout({ params: Promise.resolve({}), children: <p>content</p> })).rejects.toThrow("NEXT_REDIRECT:/app");
  });

  it("redirects an INTERVIEWER (non-admin role) to /app", async () => {
    getCurrentUser.mockResolvedValue({ id: "u2", email: "interviewer@example.com", roles: ["INTERVIEWER"] });

    await expect(AdminLayout({ params: Promise.resolve({}), children: <p>content</p> })).rejects.toThrow("NEXT_REDIRECT:/app");
  });

  it("renders the admin shell for an ADMIN user", async () => {
    getCurrentUser.mockResolvedValue({ id: "u3", email: "admin@example.com", roles: ["CANDIDATE", "ADMIN"] });

    render(await AdminLayout({ params: Promise.resolve({}), children: <p>admin content</p> }));

    expect(screen.getByTestId("admin-shell")).toHaveAttribute("data-email", "admin@example.com");
    expect(screen.getByText("admin content")).toBeInTheDocument();
  });

  it("renders the admin shell for a SUPER_ADMIN user", async () => {
    getCurrentUser.mockResolvedValue({ id: "u4", email: "super@example.com", roles: ["SUPER_ADMIN"] });

    render(await AdminLayout({ params: Promise.resolve({}), children: <p>admin content</p> }));

    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
  });
});
