import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push, getPreferences, updatePreferences } = vi.hoisted(() => ({
  push: vi.fn(),
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/candidate/client", () => ({ getPreferences, updatePreferences }));

import { CareerStep } from "./CareerStep";

describe("CareerStep", () => {
  afterEach(() => {
    push.mockClear();
    getPreferences.mockClear();
    updatePreferences.mockClear();
  });

  it("renders existing preferences", async () => {
    getPreferences.mockResolvedValue({
      ok: true,
      data: { preferred_roles: ["Software Developer"], preferred_locations: ["Remote"] },
    });
    render(<CareerStep />);

    expect(await screen.findByText("Software Developer")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
  });

  it("adds a role not from any hardcoded list", async () => {
    getPreferences.mockResolvedValue({
      ok: true,
      data: { preferred_roles: [], preferred_locations: [] },
    });
    render(<CareerStep />);
    await screen.findByPlaceholderText("e.g. Software Developer");

    fireEvent.change(screen.getByPlaceholderText("e.g. Software Developer"), {
      target: { value: "Underwater Basket Weaver" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^add$/i })[0]);

    expect(await screen.findByText("Underwater Basket Weaver")).toBeInTheDocument();
  });

  it("saves both lists and continues on success", async () => {
    getPreferences.mockResolvedValue({
      ok: true,
      data: { preferred_roles: ["Software Developer"], preferred_locations: ["Remote"] },
    });
    updatePreferences.mockResolvedValue({ ok: true, data: {} });
    render(<CareerStep />);
    await screen.findByText("Software Developer");

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() =>
      expect(updatePreferences).toHaveBeenCalledWith({
        preferred_roles: ["Software Developer"],
        preferred_locations: ["Remote"],
      }),
    );
    expect(push).toHaveBeenCalledWith("/onboarding/goal");
  });

  it("blocks Continue and shows an error when no roles have been added", async () => {
    getPreferences.mockResolvedValue({
      ok: true,
      data: { preferred_roles: [], preferred_locations: [] },
    });
    render(<CareerStep />);
    await screen.findByPlaceholderText("e.g. Software Developer");

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Add at least one preferred role and one preferred location to continue.",
    );
    expect(updatePreferences).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks Continue and shows an error when roles are set but locations are empty", async () => {
    getPreferences.mockResolvedValue({
      ok: true,
      data: { preferred_roles: ["Software Developer"], preferred_locations: [] },
    });
    render(<CareerStep />);
    await screen.findByText("Software Developer");

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Add at least one preferred role and one preferred location to continue.",
    );
    expect(updatePreferences).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows an error and does not navigate when save fails", async () => {
    getPreferences.mockResolvedValue({
      ok: true,
      data: { preferred_roles: ["Software Developer"], preferred_locations: ["Remote"] },
    });
    updatePreferences.mockResolvedValue({ ok: false, error: "Something went wrong" });
    render(<CareerStep />);
    await screen.findByPlaceholderText("e.g. Software Developer");

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(push).not.toHaveBeenCalled();
  });
});
