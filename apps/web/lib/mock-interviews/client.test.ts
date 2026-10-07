import { afterEach, describe, expect, it, vi } from "vitest";

import { bookInterview, getAvailableSlots } from "@/lib/mock-interviews/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mock-interviews client", () => {
  it("requests the given interview type's slots", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => [] }),
    );

    await getAvailableSlots("HR");

    expect(fetch).toHaveBeenCalledWith(
      "/api/candidate/mock-interviews/slots?interview_type=HR",
      expect.anything(),
    );
  });

  it("surfaces a 409 insufficient-credit error message from the backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          detail: "You don't have enough Mock Interview credits. Required: 1, available: 0.",
        }),
      }),
    );

    const result = await bookInterview("slot1");

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "You don't have enough Mock Interview credits. Required: 1, available: 0.",
    });
  });

  it("strips Pydantic's 'Value error, ' prefix when present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ detail: [{ msg: "Value error, Please specify a role.", loc: [] }] }),
      }),
    );

    const result = await bookInterview("slot1");

    expect(result).toEqual({ ok: false, status: 422, error: "Please specify a role." });
  });
});
