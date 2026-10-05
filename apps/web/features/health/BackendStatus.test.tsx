import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackendStatus } from "./BackendStatus";

describe("BackendStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Connected when the backend health check succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok" }),
      }),
    );

    render(<BackendStatus />);

    await waitFor(() => expect(screen.getByText("Backend: Connected")).toBeInTheDocument());
  });

  it("shows Not Connected when the backend health check fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    render(<BackendStatus />);

    await waitFor(() => expect(screen.getByText("Backend: Not Connected")).toBeInTheDocument());
  });
});
