import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect, getAccessToken, getServerCandidates } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerCandidates: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/admin/backend", () => ({ getServerCandidates }));

import AdminCandidatesPage from "./page";

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
  getServerCandidates.mockReset();
});

describe("AdminCandidatesPage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(AdminCandidatesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("shows an empty state with no fake rows when there are no candidates", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidates.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });

    render(await AdminCandidatesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("No candidates found")).toBeInTheDocument();
    expect(screen.getByText("No candidates have registered yet.")).toBeInTheDocument();
  });

  it("renders paginated candidate rows and passes search through to the backend call", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidates.mockResolvedValue({
      items: [
        {
          id: "c1",
          email: "dana@example.com",
          first_name: "Dana",
          last_name: "Lee",
          current_status: "Actively looking",
          completion_percentage: 80,
          created_at: "2026-10-01T00:00:00Z",
        },
      ],
      total: 45,
      page: 2,
      page_size: 20,
    });

    render(await AdminCandidatesPage({ searchParams: Promise.resolve({ page: "2", search: "dana" }) }));

    expect(getServerCandidates).toHaveBeenCalledWith("token", { page: 2, page_size: 20, search: "dana" });
    expect(screen.getByText("Dana Lee")).toBeInTheDocument();
    expect(screen.getByText("dana@example.com")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dana Lee" })).toHaveAttribute("href", "/admin/candidates/c1");
  });

  it("shows a different empty message when a search returns no matches", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidates.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });

    render(await AdminCandidatesPage({ searchParams: Promise.resolve({ search: "nobody" }) }));

    expect(screen.getByText("Try a different search term.")).toBeInTheDocument();
  });

  it("shows an error state when the candidate list fails to load", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidates.mockResolvedValue(null);

    render(await AdminCandidatesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
