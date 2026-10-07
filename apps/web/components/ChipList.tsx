"use client";

import { useState } from "react";

type ChipListProps = {
  label: string;
  placeholder: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
};

/** Add/remove chip input shared by the onboarding Career and Skills
 * steps (previously a local `TagInput` copy in each). */
export function ChipList({ label, placeholder, values, onAdd, onRemove }: ChipListProps) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (value) {
      onAdd(value);
      setDraft("");
    }
  }

  return (
    <div>
      <label>
        {label}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <button type="button" onClick={add} style={{ flexShrink: 0 }}>
            Add
          </button>
        </div>
      </label>

      {values.length > 0 && (
        <ul className="chip-list" style={{ marginTop: "0.625rem" }}>
          {values.map((value) => (
            <li key={value} className="badge badge-neutral" style={{ gap: "0.5rem", paddingRight: "0.375rem" }}>
              {value}
              <button
                type="button"
                className="chip-remove"
                onClick={() => onRemove(value)}
                aria-label={`Remove ${value}`}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
