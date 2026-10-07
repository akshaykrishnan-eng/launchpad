"use client";

import { useEffect, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { EventStatusBadge } from "@/features/events/EventStatusBadge";
import { EVENT_TYPE_LABELS, formatEventDateTime } from "@/lib/events/labels";
import { getEvent, registerForEvent } from "@/lib/events/client";
import type { Event } from "@/lib/events/types";

export function EventDetail({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // The .then() callback is written inline, directly in the effect
  // body (not routed through a named helper), which is what keeps
  // Vitest's react-hooks/set-state-in-effect check happy -- see
  // features/linkedin/LinkedInCentre.tsx for the fuller explanation.
  useEffect(() => {
    getEvent(eventId).then((result) => {
      if (!result.ok) {
        if (result.status === 404) {
          setNotFound(true);
        } else {
          setHasError(true);
        }
        setIsLoading(false);
        return;
      }
      setEvent(result.data);
      setIsLoading(false);
    });
  }, [eventId]);

  function load() {
    setIsLoading(true);
    setHasError(false);
    setNotFound(false);
    getEvent(eventId).then((result) => {
      if (!result.ok) {
        if (result.status === 404) {
          setNotFound(true);
        } else {
          setHasError(true);
        }
        setIsLoading(false);
        return;
      }
      setEvent(result.data);
      setIsLoading(false);
    });
  }

  async function handleRegister() {
    setRegisterError(null);
    setIsRegistering(true);
    const result = await registerForEvent(eventId);
    setIsRegistering(false);
    if (!result.ok) {
      setRegisterError(result.error);
      return;
    }
    load();
  }

  if (isLoading) {
    return <CentreLoadingSkeleton label="Loading event..." />;
  }

  if (notFound) {
    return <ErrorState message="This event couldn't be found." onRetry={load} />;
  }

  if (hasError || !event) {
    return <ErrorState message="We couldn't load this event right now." onRetry={load} />;
  }

  const isRegistrationOpen = event.status === "PUBLISHED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <section className="card">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
          <span className="badge badge-info">{EVENT_TYPE_LABELS[event.event_type]}</span>
          <EventStatusBadge status={event.status} />
        </div>
        <h1 style={{ marginTop: 0 }}>{event.title}</h1>
        <p style={{ color: "var(--color-text-secondary)" }}>{event.description}</p>

        <dl style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
          <div>
            <dt style={{ display: "inline", fontWeight: 600 }}>Starts: </dt>
            <dd style={{ display: "inline" }}>
              {formatEventDateTime(event.starts_at)} ({event.timezone})
            </dd>
          </div>
          <div>
            <dt style={{ display: "inline", fontWeight: 600 }}>Ends: </dt>
            <dd style={{ display: "inline" }}>{formatEventDateTime(event.ends_at)}</dd>
          </div>
          {event.location && (
            <div>
              <dt style={{ display: "inline", fontWeight: 600 }}>Location: </dt>
              <dd style={{ display: "inline" }}>{event.location}</dd>
            </div>
          )}
          {event.is_registered && event.meeting_url && (
            <div>
              <dt style={{ display: "inline", fontWeight: 600 }}>Meeting link: </dt>
              <dd style={{ display: "inline" }}>
                <a href={event.meeting_url} target="_blank" rel="noreferrer">
                  {event.meeting_url}
                </a>
              </dd>
            </div>
          )}
        </dl>

        <div style={{ marginTop: "1.25rem" }}>
          {event.is_registered ? (
            <span className="badge badge-success">Registered ✓</span>
          ) : isRegistrationOpen ? (
            <button type="button" className="btn-primary" onClick={handleRegister} disabled={isRegistering}>
              {isRegistering ? "Registering..." : "Register"}
            </button>
          ) : (
            <p style={{ color: "var(--color-text-secondary)" }}>
              Registration is closed for this {event.status === "CANCELLED" ? "cancelled" : "past"} event.
            </p>
          )}
          {registerError && (
            <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
              {registerError}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
