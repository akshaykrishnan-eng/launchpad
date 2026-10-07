"use client";

import { useEffect, useState } from "react";

import { AdminErrorState } from "@/features/admin/AdminErrorState";
import { EventForm } from "@/features/admin/EventForm";
import { EventRegistrationsTable } from "@/features/admin/EventRegistrationsTable";
import { EventStatusBadge } from "@/features/events/EventStatusBadge";
import {
  cancelEvent,
  getEvent,
  getEventRegistrations,
  publishEvent,
  unpublishEvent,
  updateEvent,
} from "@/lib/admin/client";
import type { AdminEventItem, EventRegistrationAdminItem } from "@/lib/admin/types";
import { CentreLoadingSkeleton } from "@/components/Skeleton";

export function EventDetailAdmin({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<AdminEventItem | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistrationAdminItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  // The .then() callback is written inline, directly in the effect
  // body (not routed through a named helper), which is what keeps
  // Vitest's react-hooks/set-state-in-effect check happy -- see
  // features/linkedin/LinkedInCentre.tsx for the fuller explanation.
  useEffect(() => {
    Promise.all([getEvent(eventId), getEventRegistrations(eventId, { page: 1, page_size: 50 })]).then(
      ([eventResult, registrationsResult]) => {
        if (!eventResult.ok) {
          setHasError(true);
          setIsLoading(false);
          return;
        }
        setEvent(eventResult.data);
        setRegistrations(registrationsResult.ok ? registrationsResult.data.items : []);
        setIsLoading(false);
      },
    );
  }, [eventId]);

  function load() {
    setIsLoading(true);
    setHasError(false);
    Promise.all([getEvent(eventId), getEventRegistrations(eventId, { page: 1, page_size: 50 })]).then(
      ([eventResult, registrationsResult]) => {
        if (!eventResult.ok) {
          setHasError(true);
          setIsLoading(false);
          return;
        }
        setEvent(eventResult.data);
        setRegistrations(registrationsResult.ok ? registrationsResult.data.items : []);
        setIsLoading(false);
      },
    );
  }

  async function handleAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setActionError(null);
    setIsActing(true);
    const result = await action();
    setIsActing(false);
    if (!result.ok) {
      setActionError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    load();
  }

  if (isLoading) {
    return <CentreLoadingSkeleton label="Loading event..." />;
  }

  if (hasError || !event) {
    return <AdminErrorState message="We couldn't load this event right now." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <h2 style={{ marginBottom: "0.5rem" }}>{event.title}</h2>
            <EventStatusBadge status={event.status} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {event.status === "DRAFT" && (
              <button
                type="button"
                className="btn-primary"
                disabled={isActing}
                onClick={() => handleAction(() => publishEvent(event.id))}
              >
                Publish
              </button>
            )}
            {event.status === "PUBLISHED" && (
              <button
                type="button"
                className="btn-ghost"
                disabled={isActing}
                onClick={() => handleAction(() => unpublishEvent(event.id))}
              >
                Unpublish
              </button>
            )}
            {event.status !== "CANCELLED" && (
              <button
                type="button"
                className="btn-ghost"
                disabled={isActing}
                onClick={() => handleAction(() => cancelEvent(event.id))}
              >
                Cancel event
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={() => setIsEditing((v) => !v)}>
              {isEditing ? "Close edit" : "Edit"}
            </button>
          </div>
        </div>
        {actionError && (
          <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem", marginTop: "0.75rem" }}>
            {actionError}
          </p>
        )}
      </section>

      {isEditing && (
        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Edit Event</h2>
          <EventForm
            initial={event}
            submitLabel="Save changes"
            onSubmit={async (payload) => {
              const result = await updateEvent(event.id, payload);
              if (result.ok) load();
              return result.ok ? { ok: true } : { ok: false, error: result.error };
            }}
          />
        </section>
      )}

      <section>
        <h2 style={{ marginBottom: "0.875rem" }}>
          Registrations ({event.registration_count})
        </h2>
        <EventRegistrationsTable items={registrations ?? []} />
      </section>
    </div>
  );
}
