import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// The sidebar renders NotificationBadge (fetch-on-mount) for every
// test in this file; mocked the same way CreditsCentre.test.tsx mocks
// its own lib/*/client module, so no test here makes a real fetch().
vi.mock("@/lib/notifications/client", () => ({
  getUnreadNotificationCount: vi.fn().mockResolvedValue({ ok: true, data: { unread_count: 0 } }),
}));

import { Sidebar } from "./Sidebar";

// The candidate shell is the only entry point into /admin for an
// admin-capable user; the real security boundary is still the backend
// (require_admin) and the /admin layout's own server-side role check --
// this only confirms a CANDIDATE is never even offered the link.
describe("Sidebar", () => {
  it("does not show an Admin link for a plain CANDIDATE", () => {
    render(<Sidebar email="candidate@example.com" roles={["CANDIDATE"]} />);

    expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();
  });

  it("shows an Admin link for an ADMIN user", () => {
    render(<Sidebar email="admin@example.com" roles={["ADMIN"]} />);

    expect(screen.getByRole("link", { name: /admin/i })).toHaveAttribute("href", "/admin");
  });

  it("shows an Admin link for a SUPER_ADMIN user", () => {
    render(<Sidebar email="super@example.com" roles={["SUPER_ADMIN"]} />);

    expect(screen.getByRole("link", { name: /admin/i })).toHaveAttribute("href", "/admin");
  });

  it("does not show an Admin link when there are no roles (logged-out display state)", () => {
    render(<Sidebar email={null} roles={[]} />);

    expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();
  });

  it("shows a normal Dashboard link when the candidate's profile is complete", () => {
    render(<Sidebar email="done@example.com" roles={["CANDIDATE"]} isProfileComplete={true} />);

    const link = screen.getByRole("link", { name: /^dashboard$/i });
    expect(link).toHaveAttribute("href", "/app");
    expect(link).not.toHaveAttribute("aria-disabled");
  });

  it("shows a locked Dashboard entry with 'complete setup' hint when profile is incomplete", () => {
    render(<Sidebar email="new@example.com" roles={["CANDIDATE"]} isProfileComplete={false} />);

    const locked = screen.getByRole("link", { name: /dashboard.*complete setup/i });
    expect(locked).toHaveAttribute("href", "/app");
    expect(locked).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Complete setup")).toBeInTheDocument();
  });

  it("defaults to a normal Dashboard link when isProfileComplete is not passed", () => {
    render(<Sidebar email="default@example.com" roles={["CANDIDATE"]} />);

    const link = screen.getByRole("link", { name: /^dashboard$/i });
    expect(link).toHaveAttribute("href", "/app");
    expect(link).not.toHaveAttribute("aria-disabled");
  });
});
