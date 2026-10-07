import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push, listEducation, createEducation, updateEducation } = vi.hoisted(() => ({
  push: vi.fn(),
  listEducation: vi.fn(),
  createEducation: vi.fn(),
  updateEducation: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/candidate/client", () => ({ listEducation, createEducation, updateEducation }));

import { EducationStep } from "./EducationStep";

describe("EducationStep", () => {
  afterEach(() => {
    push.mockClear();
    listEducation.mockClear();
    createEducation.mockClear();
    updateEducation.mockClear();
  });

  it("renders the education fields", async () => {
    listEducation.mockResolvedValue({ ok: true, data: [] });
    render(<EducationStep />);

    expect(await screen.findByLabelText("Institution")).toBeInTheDocument();
    expect(screen.getByLabelText("Degree")).toBeInTheDocument();
    expect(screen.getByLabelText("Specialisation")).toBeInTheDocument();
    expect(screen.getByLabelText("Graduation year")).toBeInTheDocument();
  });

  it("requires institution and degree before continuing", async () => {
    listEducation.mockResolvedValue({ ok: true, data: [] });
    render(<EducationStep />);
    await screen.findByLabelText("Institution");

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Institution and degree are required.",
    );
    expect(createEducation).not.toHaveBeenCalled();
  });

  it("rejects an invalid graduation year", async () => {
    listEducation.mockResolvedValue({ ok: true, data: [] });
    render(<EducationStep />);
    await screen.findByLabelText("Institution");

    fireEvent.change(screen.getByLabelText("Institution"), { target: { value: "State U" } });
    fireEvent.change(screen.getByLabelText("Degree"), { target: { value: "BSc" } });
    fireEvent.change(screen.getByLabelText("Graduation year"), { target: { value: "1800" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please enter a valid graduation year.",
    );
  });

  it("creates a new entry and continues when none existed", async () => {
    listEducation.mockResolvedValue({ ok: true, data: [] });
    createEducation.mockResolvedValue({ ok: true, data: {} });
    render(<EducationStep />);
    await screen.findByLabelText("Institution");

    fireEvent.change(screen.getByLabelText("Institution"), { target: { value: "State U" } });
    fireEvent.change(screen.getByLabelText("Degree"), { target: { value: "BSc" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => expect(createEducation).toHaveBeenCalled());
    expect(updateEducation).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/onboarding/skills");
  });

  it("updates the existing entry when one was found, pre-filling its fields", async () => {
    listEducation.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "edu-1",
          institution: "State U",
          degree: "BSc",
          specialization: "CS",
          start_year: null,
          graduation_year: 2024,
          education_status: null,
        },
      ],
    });
    updateEducation.mockResolvedValue({ ok: true, data: {} });
    render(<EducationStep />);

    expect(await screen.findByLabelText("Institution")).toHaveValue("State U");

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => expect(updateEducation).toHaveBeenCalledWith("edu-1", expect.anything()));
    expect(createEducation).not.toHaveBeenCalled();
  });

  it("navigates back to the about step", async () => {
    listEducation.mockResolvedValue({ ok: true, data: [] });
    render(<EducationStep />);
    await screen.findByLabelText("Institution");

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(push).toHaveBeenCalledWith("/onboarding/about");
  });
});
