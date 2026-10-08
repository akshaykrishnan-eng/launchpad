import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { ExperienceStep } from "./ExperienceStep";

describe("ExperienceStep", () => {
  afterEach(() => {
    push.mockClear();
  });

  it("shows the empty state when no experience exists yet", () => {
    render(<ExperienceStep experience={[]} />);

    expect(screen.getByText("No experience added yet")).toBeInTheDocument();
  });

  it("renders existing experience entries", () => {
    render(
      <ExperienceStep
        experience={[
          {
            id: "e1",
            company: "Acme",
            job_title: "Engineer",
            location: null,
            start_date: "2020-01-01",
            end_date: null,
            is_current: true,
            description: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("continues to the next step without requiring any experience", () => {
    render(<ExperienceStep experience={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(push).toHaveBeenCalledWith("/onboarding/career");
  });

  it("navigates back to the skills step", () => {
    render(<ExperienceStep experience={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(push).toHaveBeenCalledWith("/onboarding/skills");
  });
});
