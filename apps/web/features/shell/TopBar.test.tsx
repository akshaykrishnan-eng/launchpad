import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }));
vi.mock("@/lib/candidate/client", () => ({ getProfile }));

vi.mock("@/lib/auth/client", () => ({ logout: vi.fn().mockResolvedValue({ ok: true }) }));

import { TopBar } from "./TopBar";

function profile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "p1",
    user_id: "u1",
    first_name: "Akshay",
    last_name: "Krishnan",
    mobile_number: null,
    current_city: null,
    current_status: null,
    degree: null,
    specialisation: null,
    graduation_year: null,
    career_goal: null,
    completion_percentage: 40,
    ...overrides,
  };
}

afterEach(() => {
  getProfile.mockReset();
});

describe("TopBar", () => {
  it("renders the search placeholder, bell link, and candidate name once the profile loads", async () => {
    getProfile.mockResolvedValue({ ok: true, data: profile() });

    render(<TopBar email="akshay@example.com" unreadCount={0} onOpenMobileMenu={vi.fn()} />);

    expect(screen.getByPlaceholderText("Search pages...")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /notifications/i })).toHaveAttribute(
      "href",
      "/app/notifications",
    );
    expect(await screen.findByText("Akshay Krishnan")).toBeInTheDocument();
    expect(screen.getByText("Candidate")).toBeInTheDocument();
  });

  it("falls back to the email initial when the candidate profile has no name yet", async () => {
    getProfile.mockResolvedValue({ ok: true, data: profile({ first_name: null, last_name: null }) });

    render(<TopBar email="akshay@example.com" unreadCount={0} onOpenMobileMenu={vi.fn()} />);

    expect(await screen.findByText("akshay@example.com")).toBeInTheDocument();
  });

  it("shows the shared unread count on the bell and keeps it hidden at zero", async () => {
    getProfile.mockResolvedValue({ ok: true, data: profile() });

    const { rerender } = render(
      <TopBar email="akshay@example.com" unreadCount={0} onOpenMobileMenu={vi.fn()} />,
    );
    expect(screen.queryByText("3")).not.toBeInTheDocument();

    rerender(<TopBar email="akshay@example.com" unreadCount={3} onOpenMobileMenu={vi.fn()} />);
    expect(await screen.findByText("3")).toBeInTheDocument();
  });

  it("opens the account menu with Profile and Log out actions", async () => {
    getProfile.mockResolvedValue({ ok: true, data: profile() });

    render(<TopBar email="akshay@example.com" unreadCount={0} onOpenMobileMenu={vi.fn()} />);
    await screen.findByText("Akshay Krishnan");

    fireEvent.click(screen.getByRole("button", { name: /akshay krishnan/i }));

    expect(screen.getByRole("link", { name: /profile/i })).toHaveAttribute("href", "/app/profile");
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
  });

  it("calls onOpenMobileMenu when the mobile menu trigger is clicked", async () => {
    getProfile.mockResolvedValue({ ok: true, data: profile() });
    const onOpenMobileMenu = vi.fn();

    render(<TopBar email="akshay@example.com" unreadCount={0} onOpenMobileMenu={onOpenMobileMenu} />);

    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));

    expect(onOpenMobileMenu).toHaveBeenCalledTimes(1);
  });
});
