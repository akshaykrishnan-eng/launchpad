"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SearchIcon } from "@/components/icons";
import { SEARCH_ENTRIES, searchEntries, type SearchEntry } from "@/features/shell/searchRegistry";

const LISTBOX_ID = "topbar-search-listbox";

/** Controlled combobox that replaces the inert search placeholder in
 *  TopBar.  Results come from the client-side searchRegistry -- page
 *  names and common action keywords, no backend call needed. */
export function CandidateSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results: SearchEntry[] = query.trim() ? searchEntries(query) : SEARCH_ENTRIES;

  // Dismiss when the user clicks outside the search container.
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(0);
          return;
        }
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (isOpen && activeIndex >= 0 && results[activeIndex]) {
          event.preventDefault();
          navigate(results[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  }

  function navigate(entry: SearchEntry) {
    router.push(entry.href);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  }

  const activeDescendant =
    isOpen && activeIndex >= 0 ? `topbar-search-option-${activeIndex}` : undefined;

  return (
    <div className="app-topbar-search" ref={containerRef}>
      <SearchIcon aria-hidden className="app-topbar-search-icon" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search pages"
        aria-expanded={isOpen}
        aria-controls={LISTBOX_ID}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        placeholder="Search pages..."
        className="app-topbar-search-input"
        value={query}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <ul
          id={LISTBOX_ID}
          role="listbox"
          aria-label="Search results"
          className="search-dropdown"
        >
          {results.length === 0 ? (
            <li role="presentation" className="search-dropdown-empty">
              No results for &ldquo;{query}&rdquo;
            </li>
          ) : (
            results.map((entry, i) => {
              const EntryIcon = entry.icon;
              return (
                <li
                  key={entry.href}
                  id={`topbar-search-option-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  className="search-dropdown-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => navigate(entry)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <EntryIcon aria-hidden className="search-dropdown-item-icon" />
                  {entry.label}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
