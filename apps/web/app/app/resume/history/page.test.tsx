import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect, getAccessToken } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/resume/client", () => ({
  getResumeHistory: vi.fn().mockResolvedValue({
    ok: true,
    data: { items: [], total: 0, page: 1, page_size: 20 },
  }),
}));

import ResumeHistoryPage from "./page";

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
});

describe("ResumeHistoryPage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(ResumeHistoryPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("renders the Resume History heading when authenticated", async () => {
    getAccessToken.mockResolvedValue("token");

    render(await ResumeHistoryPage());

    expect(screen.getByRole("heading", { name: /resume history/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /resume centre/i })).toHaveAttribute("href", "/app/resume");
    expect(await screen.findByText(/no previous resume versions yet/i)).toBeInTheDocument();
  });
});
