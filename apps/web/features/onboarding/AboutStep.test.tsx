import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push, getProfile, updateProfile } = vi.hoisted(() => ({
  push: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/candidate/client", () => ({ getProfile, updateProfile }));

import { AboutStep } from "./AboutStep";

const EMPTY_PROFILE = {
  ok: true,
  data: {
    id: "1",
    user_id: "1",
    first_name: null,
    last_name: null,
    mobile_number: null,
    current_city: null,
    current_status: null,
    degree: null,
    specialisation: null,
    graduation_year: null,
    career_goal: null,
    completion_percentage: 0,
  },
};

describe("AboutStep", () => {
  afterEach(() => {
    push.mockClear();
    getProfile.mockClear();
    updateProfile.mockClear();
  });

  it("renders all fields after loading", async () => {
    getProfile.mockResolvedValue(EMPTY_PROFILE);
    render(<AboutStep />);

    expect(await screen.findByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last name")).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile number")).toBeInTheDocument();
    expect(screen.getByLabelText("Current city")).toBeInTheDocument();
    expect(screen.getByLabelText("Current status")).toBeInTheDocument();
  });

  it("shows a validation error and does not save when a field is missing", async () => {
    getProfile.mockResolvedValue(EMPTY_PROFILE);
    render(<AboutStep />);
    await screen.findByLabelText("First name");

    fireEvent.click(screen.getByRole("button", { name: /save & continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please fill in every field.");
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("saves and continues to the next step on success", async () => {
    getProfile.mockResolvedValue(EMPTY_PROFILE);
    updateProfile.mockResolvedValue({ ok: true, data: EMPTY_PROFILE.data });
    render(<AboutStep />);
    await screen.findByLabelText("First name");

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Dana" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Smith" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Current city"), { target: { value: "Austin" } });
    fireEvent.change(screen.getByLabelText("Current status"), {
      target: { value: "STUDENT" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding/education"));
  });

  it("shows the backend's error message when save fails", async () => {
    getProfile.mockResolvedValue(EMPTY_PROFILE);
    updateProfile.mockResolvedValue({ ok: false, error: "Something went wrong" });
    render(<AboutStep />);
    await screen.findByLabelText("First name");

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Dana" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Smith" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Current city"), { target: { value: "Austin" } });
    fireEvent.change(screen.getByLabelText("Current status"), {
      target: { value: "STUDENT" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save & continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates back to the onboarding overview", async () => {
    getProfile.mockResolvedValue(EMPTY_PROFILE);
    render(<AboutStep />);
    await screen.findByLabelText("First name");

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(push).toHaveBeenCalledWith("/onboarding");
  });

  it("pre-fills fields from an existing profile", async () => {
    getProfile.mockResolvedValue({
      ok: true,
      data: { ...EMPTY_PROFILE.data, first_name: "Dana", current_status: "STUDENT" },
    });
    render(<AboutStep />);

    expect(await screen.findByLabelText("First name")).toHaveValue("Dana");
  });
});
