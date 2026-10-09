import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { CandidateSearch } from "./CandidateSearch";

afterEach(() => {
  push.mockReset();
});

function getInput() {
  return screen.getByRole("combobox", { name: /search pages/i });
}

function openSearch() {
  const input = getInput();
  fireEvent.focus(input);
  return input;
}

describe("CandidateSearch", () => {
  it("renders the search combobox", () => {
    render(<CandidateSearch />);
    expect(getInput()).toBeInTheDocument();
  });

  it("shows all destinations when the input receives focus", () => {
    render(<CandidateSearch />);
    openSearch();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /resume/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /credits/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /notifications/i })).toBeInTheDocument();
  });

  it("filters results when the user types a label match", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "resume" } });
    expect(screen.getByRole("option", { name: /resume/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^dashboard$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^credits$/i })).not.toBeInTheDocument();
  });

  it("matches by keyword as well as label", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "upload resume" } });
    expect(screen.getByRole("option", { name: /resume/i })).toBeInTheDocument();
  });

  it("is case-insensitive", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "CREDITS" } });
    expect(screen.getByRole("option", { name: /credits/i })).toBeInTheDocument();
  });

  it("shows an empty state when no results match the query", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "xyzzy-not-a-page" } });
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("navigates to the correct route when a result is clicked", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "credits" } });
    fireEvent.click(screen.getByRole("option", { name: /credits/i }));
    expect(push).toHaveBeenCalledWith("/app/credits");
  });

  it("clears the query and closes the dropdown after navigation", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "credits" } });
    fireEvent.click(screen.getByRole("option", { name: /credits/i }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("closes the dropdown when Escape is pressed", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("moves selection with Arrow Down and confirms it with Enter", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    // Arrow Down twice: activeIndex 0 (Dashboard) → 1 (Profile)
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "topbar-search-option-1");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/app/profile");
  });

  it("sets aria-selected on the active keyboard item", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");
  });

  it("does not include admin routes in search results", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "admin" } });
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it("keyword 'book interview' leads to the mock-interviews route", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "book interview" } });
    fireEvent.click(screen.getByRole("option", { name: /interviews/i }));
    expect(push).toHaveBeenCalledWith("/app/mock-interviews");
  });

  it("keyword 'view credits' leads to the credits route", () => {
    render(<CandidateSearch />);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "view credits" } });
    fireEvent.click(screen.getByRole("option", { name: /credits/i }));
    expect(push).toHaveBeenCalledWith("/app/credits");
  });
});
