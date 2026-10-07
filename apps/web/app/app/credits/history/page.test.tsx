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
vi.mock("@/lib/credits/client", () => ({
  getCreditTransactions: vi.fn().mockResolvedValue({
    ok: true,
    data: { items: [], total: 0, page: 1, page_size: 20 },
  }),
}));

import CreditHistoryPage from "./page";

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
});

describe("CreditHistoryPage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(CreditHistoryPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("renders the Credit History heading when authenticated", async () => {
    getAccessToken.mockResolvedValue("token");

    render(await CreditHistoryPage());

    expect(screen.getByRole("heading", { name: /credit history/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /credits/i })).toHaveAttribute("href", "/app/credits");
    expect(await screen.findByText("No credit activity yet.")).toBeInTheDocument();
  });
});
