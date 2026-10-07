"use client";

import { useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ExperienceForm } from "@/features/profile/ExperienceForm";
import { ExperienceTimeline } from "@/features/profile/ExperienceTimeline";
import type { WorkExperience } from "@/lib/candidate/types";

type Mode = "closed" | "add" | WorkExperience;

export function WorkExperienceSection({ experience }: { experience: WorkExperience[] }) {
  const [mode, setMode] = useState<Mode>("closed");
  const hasExperience = experience.length > 0;
  const formOpen = mode !== "closed";
  const editingEntry = formOpen && mode !== "add" ? mode : null;

  return (
    <div className="section-block">
      <div className="section-block-header">
        <h2 style={{ fontSize: "1rem" }}>Work experience</h2>
        {hasExperience && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setMode("add")}
            disabled={formOpen}
            style={{ display: "inline-flex" }}
          >
            + Add experience
          </button>
        )}
      </div>

      {hasExperience ? (
        <>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem", marginTop: "-0.375rem", marginBottom: "0.875rem" }}>
            Your professional journey
          </p>
          <ExperienceTimeline experience={experience} onEdit={(entry) => setMode(entry)} editable={!formOpen} />
        </>
      ) : (
        !formOpen && (
          <EmptyState
            heading="No experience added yet"
            description="Adding your professional experience helps recruiters understand your background."
            action={
              <button type="button" className="btn-primary" onClick={() => setMode("add")}>
                + Add experience
              </button>
            }
          />
        )
      )}

      {formOpen && (
        <div style={{ marginTop: hasExperience ? "1.25rem" : 0 }}>
          <ExperienceForm
            key={editingEntry?.id ?? "new"}
            experience={editingEntry}
            onCancel={() => setMode("closed")}
            onSaved={() => setMode("closed")}
          />
        </div>
      )}
    </div>
  );
}
