import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { createSlot, refresh } = vi.hoisted(() => ({
  createSlot: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/admin/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/client")>("@/lib/admin/client");
  return { ...actual, createSlot };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

import { CreateSlotForm } from "./CreateSlotForm";

afterEach(() => {
  createSlot.mockReset();
  refresh.mockReset();
});

describe("CreateSlotForm", () => {
  it("defaults the start time to roughly 24 hours from now", () => {
    render(<CreateSlotForm />);

    const input = screen.getByLabelText(/start/i) as HTMLInputElement;
    expect(input.value).not.toBe("");
  });

  it("rejects an unparseable start time without calling the API", () => {
    render(<CreateSlotForm />);

    fireEvent.change(screen.getByLabelText(/start/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /create slot/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/valid start time/i);
    expect(createSlot).not.toHaveBeenCalled();
  });

  it("submits interview type, start, and a computed end time, then refreshes", async () => {
    createSlot.mockResolvedValue({ ok: true, data: { id: "slot1", interview_type: "HR", starts_at: "x", ends_at: "y", status: "OPEN" } });

    render(<CreateSlotForm />);

    fireEvent.change(screen.getByLabelText(/interview type/i), { target: { value: "TECHNICAL" } });
    fireEvent.change(screen.getByLabelText(/start/i), { target: { value: "2026-11-01T10:00" } });
    fireEvent.change(screen.getByLabelText(/duration/i), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /create slot/i }));

    await waitFor(() => expect(createSlot).toHaveBeenCalledTimes(1));
    const payload = createSlot.mock.calls[0][0];
    expect(payload.interview_type).toBe("TECHNICAL");
    expect(new Date(payload.ends_at).getTime() - new Date(payload.starts_at).getTime()).toBe(30 * 60 * 1000);

    await waitFor(() => expect(screen.getByText("Slot created.")).toBeInTheDocument());
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a server-side rejection (e.g. end before start) without crashing", async () => {
    createSlot.mockResolvedValue({ ok: false, status: 422, error: "ends_at must be after starts_at." });

    render(<CreateSlotForm />);

    fireEvent.change(screen.getByLabelText(/start/i), { target: { value: "2026-11-01T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: /create slot/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ends_at must be after starts_at.");
  });
});
