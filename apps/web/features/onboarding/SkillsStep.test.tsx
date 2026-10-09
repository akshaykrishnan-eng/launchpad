import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push, listSkills, addSkill, removeSkill } = vi.hoisted(() => ({
  push: vi.fn(),
  listSkills: vi.fn(),
  addSkill: vi.fn(),
  removeSkill: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/candidate/client", () => ({ listSkills, addSkill, removeSkill }));

import { SkillsStep } from "./SkillsStep";

describe("SkillsStep", () => {
  afterEach(() => {
    push.mockClear();
    listSkills.mockClear();
    addSkill.mockClear();
    removeSkill.mockClear();
  });

  it("renders existing skills", async () => {
    listSkills.mockResolvedValue({ ok: true, data: [{ id: "1", name: "Python" }] });
    render(<SkillsStep />);

    expect(await screen.findByText("Python")).toBeInTheDocument();
  });

  it("adds a skill", async () => {
    listSkills.mockResolvedValue({ ok: true, data: [] });
    addSkill.mockResolvedValue({ ok: true, data: { id: "1", name: "Python" } });
    render(<SkillsStep />);
    await screen.findByPlaceholderText("e.g. Python");

    fireEvent.change(screen.getByPlaceholderText("e.g. Python"), {
      target: { value: "Python" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    expect(await screen.findByText("Python")).toBeInTheDocument();
    expect(addSkill).toHaveBeenCalledWith("Python");
  });

  it("prevents adding a duplicate skill client-side", async () => {
    listSkills.mockResolvedValue({ ok: true, data: [{ id: "1", name: "Python" }] });
    render(<SkillsStep />);
    await screen.findByText("Python");

    fireEvent.change(screen.getByPlaceholderText("e.g. Python"), {
      target: { value: "python" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That skill has already been added.",
    );
    expect(addSkill).not.toHaveBeenCalled();
  });

  it("removes a skill", async () => {
    listSkills.mockResolvedValue({ ok: true, data: [{ id: "1", name: "Python" }] });
    removeSkill.mockResolvedValue({ ok: true, data: undefined });
    render(<SkillsStep />);
    await screen.findByText("Python");

    fireEvent.click(screen.getByRole("button", { name: /remove python/i }));

    await waitFor(() => expect(screen.queryByText("Python")).not.toBeInTheDocument());
  });

  it("blocks Continue and shows an error when no skills have been added", async () => {
    listSkills.mockResolvedValue({ ok: true, data: [] });
    render(<SkillsStep />);
    await screen.findByPlaceholderText("e.g. Python");

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Add at least one skill to continue.",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("continues to the next step once at least one skill has been added", async () => {
    listSkills.mockResolvedValue({ ok: true, data: [{ id: "1", name: "Python" }] });
    render(<SkillsStep />);
    await screen.findByText("Python");

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(push).toHaveBeenCalledWith("/onboarding/experience");
  });
});
