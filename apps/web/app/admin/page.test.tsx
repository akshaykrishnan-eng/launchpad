import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect, getAccessToken, getServerAdminDashboard } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerAdminDashboard: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/admin/backend", () => ({ getServerAdminDashboard }));

import AdminDashboardPage from "./page";

const EMPTY_DASHBOARD = {
  metrics: {
    total_candidates: 0,
    pending_resume_reviews: 0,
    pending_linkedin_reviews: 0,
    upcoming_interviews: 0,
    completed_interviews: 0,
    total_credit_transactions: 0,
  },
  recent_candidates: [],
  recent_resume_reviews: [],
  recent_linkedin_reviews: [],
};

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
  getServerAdminDashboard.mockReset();
});

describe("AdminDashboardPage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(AdminDashboardPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  // PRD section 48: an empty database must show literal zeros, never
  // fabricated placeholder numbers.
  it("shows real zero counts on an empty database, not fake data", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerAdminDashboard.mockResolvedValue(EMPTY_DASHBOARD);

    render(await AdminDashboardPage());

    expect(screen.getByText("Total Candidates")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(6);
    expect(screen.getByText("No candidates yet.")).toBeInTheDocument();
    expect(screen.getByText("No resume review requests yet.")).toBeInTheDocument();
    expect(screen.getByText("No LinkedIn review requests yet.")).toBeInTheDocument();
  });

  it("renders real metric values and recent activity", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerAdminDashboard.mockResolvedValue({
      metrics: {
        total_candidates: 12,
        pending_resume_reviews: 3,
        pending_linkedin_reviews: 1,
        upcoming_interviews: 2,
        completed_interviews: 5,
        total_credit_transactions: 20,
      },
      recent_candidates: [
        { id: "c1", email: "dana@example.com", first_name: "Dana", last_name: "Lee", created_at: "2026-10-01T00:00:00Z" },
      ],
      recent_resume_reviews: [
        {
          review: { id: "r1", resume_id: "res1", status: "REQUESTED", requested_at: "x", started_at: null, completed_at: null, result: null },
          candidate: { id: "c1", email: "dana@example.com", first_name: "Dana", last_name: "Lee" },
          resume_version: 1,
          resume_filename: "resume.pdf",
        },
      ],
      recent_linkedin_reviews: [],
    });

    render(await AdminDashboardPage());

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getAllByText("Dana Lee").length).toBeGreaterThan(0);
  });

  it("shows an error state with working retry when the dashboard fails to load", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerAdminDashboard.mockResolvedValue(null);

    render(await AdminDashboardPage());

    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
  });
});
