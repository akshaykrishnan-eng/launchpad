"use client";

import { useState } from "react";

import type { AdminEventItem, AdminEventType, CreateEventPayload } from "@/lib/admin/types";

function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStart(): string {
  return toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
}

export type EventFormValues = {
  title: string;
  description: string;
  event_type: AdminEventType;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location: string;
  meeting_url: string;
};

type EventFormProps = {
  initial?: AdminEventItem;
  onSubmit: (payload: CreateEventPayload) => Promise<{ ok: boolean; error?: string }>;
  submitLabel: string;
};

/** Shared by the admin create-event page and the edit section of the
 * event detail page -- same fields either way, only the submit
 * handler and label differ. */
export function EventForm({ initial, onSubmit, submitLabel }: EventFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [eventType, setEventType] = useState<AdminEventType>(initial?.event_type ?? "WEBINAR");
  const [startsAt, setStartsAt] = useState(() =>
    initial ? toLocalInputValue(initial.starts_at) : defaultStart(),
  );
  const [endsAt, setEndsAt] = useState(() =>
    initial
      ? toLocalInputValue(initial.ends_at)
      : toLocalInputValue(new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()),
  );
  const [timezone, setTimezone] = useState(initial?.timezone ?? "Asia/Kolkata");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [meetingUrl, setMeetingUrl] = useState(initial?.meeting_url ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const starts = new Date(startsAt);
    const ends = new Date(endsAt);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      setError("Please choose valid start and end times.");
      return;
    }
    if (ends <= starts) {
      setError("End time must be after start time.");
      return;
    }
    if (!title.trim() || !description.trim() || !timezone.trim()) {
      setError("Title, description, and timezone are required.");
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      event_type: eventType,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      timezone: timezone.trim(),
      location: location.trim() || null,
      meeting_url: meetingUrl.trim() || null,
      status: initial?.status ?? "DRAFT",
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <label htmlFor="event-title">
        Title
        <input id="event-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label htmlFor="event-description">
        Description
        <textarea
          id="event-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <label htmlFor="event-type" style={{ minWidth: "160px" }}>
          Event type
          <select id="event-type" value={eventType} onChange={(e) => setEventType(e.target.value as AdminEventType)}>
            <option value="WEBINAR">Webinar</option>
            <option value="EVENT">Event</option>
          </select>
        </label>

        <label htmlFor="event-starts" style={{ minWidth: "220px" }}>
          Starts at
          <input
            id="event-starts"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>

        <label htmlFor="event-ends" style={{ minWidth: "220px" }}>
          Ends at
          <input id="event-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>

        <label htmlFor="event-timezone" style={{ minWidth: "160px" }}>
          Timezone
          <input
            id="event-timezone"
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Asia/Kolkata"
          />
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <label htmlFor="event-location" style={{ flex: 1, minWidth: "220px" }}>
          Location (optional)
          <input id="event-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>

        <label htmlFor="event-meeting-url" style={{ flex: 1, minWidth: "220px" }}>
          Meeting URL (optional)
          <input
            id="event-meeting-url"
            type="url"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://zoom.us/j/..."
          />
        </label>
      </div>

      <div>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
          {error}
        </p>
      )}
      {success && !error && (
        <p role="status" style={{ color: "var(--color-success-text)", fontSize: "0.875rem" }}>
          Saved.
        </p>
      )}
    </form>
  );
}
