import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardLoading from "./loading";

describe("DashboardLoading", () => {
  it("renders a loading message", () => {
    render(<DashboardLoading />);

    expect(screen.getByText(/loading your dashboard/i)).toBeInTheDocument();
  });
});
