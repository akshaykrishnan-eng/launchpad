import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { grantCredit, refresh } = vi.hoisted(() => ({
  grantCredit: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/admin/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/client")>("@/lib/admin/client");
  return { ...actual, grantCredit };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

import { GrantCreditForm } from "./GrantCreditForm";

afterEach(() => {
  grantCredit.mockReset();
  refresh.mockReset();
});

describe("GrantCreditForm", () => {
  it("pre-fills the candidate id and shows the candidate label when navigated from Candidate 360", () => {
    render(<GrantCreditForm initialCandidateId="c1" initialCandidateLabel="Dana Lee" />);

    expect(screen.getByLabelText(/candidate id/i)).toHaveValue("c1");
    expect(screen.getByText(/Granting credits to/)).toBeInTheDocument();
    expect(screen.getByText("Dana Lee")).toBeInTheDocument();
  });

  it("rejects an empty candidate id without calling the API", () => {
    render(<GrantCreditForm />);

    fireEvent.click(screen.getByRole("button", { name: /grant credit/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/enter a candidate id/i);
    expect(grantCredit).not.toHaveBeenCalled();
  });

  it("rejects a non-positive amount client-side", () => {
    render(<GrantCreditForm initialCandidateId="c1" />);

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /grant credit/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/positive whole number/i);
    expect(grantCredit).not.toHaveBeenCalled();
  });

  it("submits a grant with the chosen credit type, amount, and reason, then refreshes", async () => {
    grantCredit.mockResolvedValue({
      ok: true,
      data: { id: "t1", credit_type: "MOCK_INTERVIEW", amount: 2, reason: "PROMOTIONAL_GRANT", description: "Welcome", created_at: "x" },
    });

    render(<GrantCreditForm initialCandidateId="c1" />);

    fireEvent.change(screen.getByLabelText(/credit type/i), { target: { value: "RESUME_REVIEW" } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Welcome bonus" } });
    fireEvent.click(screen.getByRole("button", { name: /grant credit/i }));

    await waitFor(() =>
      expect(grantCredit).toHaveBeenCalledWith({
        candidate_id: "c1",
        credit_type: "RESUME_REVIEW",
        amount: 2,
        reason: "PROMOTIONAL_GRANT",
        description: "Welcome bonus",
      }),
    );
    expect(await screen.findByText("Credit granted.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("surfaces a server-side rejection (e.g. unknown candidate) as an alert", async () => {
    grantCredit.mockResolvedValue({ ok: false, status: 404, error: "Candidate not found." });

    render(<GrantCreditForm initialCandidateId="ghost" />);

    fireEvent.click(screen.getByRole("button", { name: /grant credit/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Candidate not found.");
  });
});
