import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect, getAccessToken, getServerMockInterviewsAdmin, getServerSlots } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerMockInterviewsAdmin: vi.fn(),
  getServerSlots: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/admin/backend", () => ({ getServerMockInterviewsAdmin, getServerSlots }));

import AdminMockInterviewsPage from "./page";

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
  getServerMockInterviewsAdmin.mockReset();
  getServerSlots.mockReset();
});

describe("AdminMockInterviewsPage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(AdminMockInterviewsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
  });

  it("shows the slot creation form plus empty states for slots and bookings", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerMockInterviewsAdmin.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });
    getServerSlots.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 50 });

    render(await AdminMockInterviewsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Create a Slot" })).toBeInTheDocument();
    expect(screen.getByText("No interview slots yet")).toBeInTheDocument();
    expect(screen.getByText("No mock interviews booked")).toBeInTheDocument();
  });

  it("renders slots and bookings, passing the status filter through to the backend call", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerMockInterviewsAdmin.mockResolvedValue({
      items: [
        {
          interview: { id: "mi1", interview_type: "HR", role: null, status: "BOOKED", scheduled_at: "2026-11-01T10:00:00Z", created_at: "x", feedback: null },
          candidate: { id: "c1", email: "dana@example.com", first_name: "Dana", last_name: "Lee" },
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    });
    getServerSlots.mockResolvedValue({
      items: [{ id: "slot1", interview_type: "HR", starts_at: "2026-11-01T10:00:00Z", ends_at: "2026-11-01T10:30:00Z", status: "BOOKED" }],
      total: 1,
      page: 1,
      page_size: 50,
    });

    render(await AdminMockInterviewsPage({ searchParams: Promise.resolve({ status: "BOOKED" }) }));

    expect(getServerMockInterviewsAdmin).toHaveBeenCalledWith("token", { status: "BOOKED", page: 1, page_size: 20 });
    expect(screen.getByText("Dana Lee")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Complete" })).toHaveAttribute("href", "/admin/mock-interviews/mi1");
  });

  it("shows an error state when slots fail to load", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerMockInterviewsAdmin.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });
    getServerSlots.mockResolvedValue(null);

    render(await AdminMockInterviewsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
