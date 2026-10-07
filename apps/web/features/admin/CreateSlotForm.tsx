"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSlot } from "@/lib/admin/client";
import { INTERVIEW_TYPE_LABELS } from "@/lib/mock-interviews/labels";
import type { InterviewType } from "@/lib/mock-interviews/types";

const INTERVIEW_TYPES = Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[];

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateSlotForm() {
  const router = useRouter();
  const [interviewType, setInterviewType] = useState<InterviewType>("HR");
  const [startsAt, setStartsAt] = useState(() => toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const starts = new Date(startsAt);
    if (Number.isNaN(starts.getTime())) {
      setError("Please choose a valid start time.");
      return;
    }
    const ends = new Date(starts.getTime() + durationMinutes * 60 * 1000);

    setIsSubmitting(true);
    const result = await createSlot({
      interview_type: interviewType,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    // noValidate: otherwise the browser's own min/max tooltip silently
    // blocks the submit event before handleSubmit runs, pre-empting our
    // styled validation message below.
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}
    >
      <label htmlFor="slot-type" style={{ minWidth: "180px" }}>
        Interview type
        <select
          id="slot-type"
          value={interviewType}
          onChange={(e) => setInterviewType(e.target.value as InterviewType)}
        >
          {INTERVIEW_TYPES.map((type) => (
            <option key={type} value={type}>
              {INTERVIEW_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="slot-start" style={{ minWidth: "220px" }}>
        Start
        <input
          id="slot-start"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </label>

      <label htmlFor="slot-duration" style={{ minWidth: "140px" }}>
        Duration (minutes)
        <input
          id="slot-duration"
          type="number"
          min={15}
          max={240}
          step={15}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
        />
      </label>

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Slot"}
      </button>

      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem", width: "100%" }}>
          {error}
        </p>
      )}
      {success && !error && (
        <p role="status" style={{ color: "var(--color-success-text)", fontSize: "0.875rem", width: "100%" }}>
          Slot created.
        </p>
      )}
    </form>
  );
}
