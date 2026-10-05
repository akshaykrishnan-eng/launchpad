import { afterEach, describe, expect, it, vi } from "vitest";

import { saveLinkedInUrl } from "@/lib/linkedin/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saveLinkedInUrl error handling", () => {
  it("strips Pydantic's 'Value error, ' prefix from a field_validator message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          detail: [{ msg: "Value error, Please enter a linkedin.com profile URL.", loc: [] }],
        }),
      }),
    );

    const result = await saveLinkedInUrl("https://example.com/not-linkedin");

    expect(result).toEqual({
      ok: false,
      status: 422,
      error: "Please enter a linkedin.com profile URL.",
    });
  });

  it("leaves a plain string detail untouched when there's no prefix to strip", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ detail: "A review is already in progress for this LinkedIn profile" }),
      }),
    );

    const result = await saveLinkedInUrl("https://linkedin.com/in/example");

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "A review is already in progress for this LinkedIn profile",
    });
  });
});
