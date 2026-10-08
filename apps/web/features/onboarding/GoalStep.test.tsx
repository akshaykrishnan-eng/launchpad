import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push, getProfile, updateProfile } = vi.hoisted(() => ({
  push: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/candidate/client", () => ({ getProfile, updateProfile }));

import { GoalStep } from "./GoalStep";

describe("GoalStep", () => {
  afterEach(() => {
    push.mockClear();
    getProfile.mockClear();
    updateProfile.mockClear();
  });

  it("renders the career goal field", async () => {
    getProfile.mockResolvedValue({ ok: true, data: { career_goal: null } });
    render(<GoalStep />);

    expect(await screen.findByLabelText("Career goal")).toBeInTheDocument();
  });

  it("requires a non-empty goal", async () => {
    getProfile.mockResolvedValue({ ok: true, data: { career_goal: null } });
    render(<GoalStep />);
    await screen.findByLabelText("Career goal");

    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please describe what you're looking for.",
    );
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("saves and continues to the Resume career asset step on completion", async () => {
    getProfile.mockResolvedValue({ ok: true, data: { career_goal: null } });
    updateProfile.mockResolvedValue({ ok: true, data: {} });
    render(<GoalStep />);
    await screen.findByLabelText("Career goal");

    fireEvent.change(screen.getByLabelText("Career goal"), {
      target: { value: "Become a backend engineer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding/resume"));
  });

  it("pre-fills an existing career goal", async () => {
    getProfile.mockResolvedValue({ ok: true, data: { career_goal: "Existing goal" } });
    render(<GoalStep />);

    expect(await screen.findByLabelText("Career goal")).toHaveValue("Existing goal");
  });
});
