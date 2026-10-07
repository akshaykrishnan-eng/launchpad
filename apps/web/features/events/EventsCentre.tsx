"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { EventCard } from "@/features/events/EventCard";
import { PastEventRow } from "@/features/events/PastEventRow";
import { getEvents } from "@/lib/events/client";
import type { Event } from "@/lib/events/types";

function isUpcoming(event: Event): boolean {
  return event.status === "PUBLISHED";
}

export function EventsCentre() {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // The .then() callback is written inline, directly in the effect
  // body (not routed through a named helper), which is what keeps
  // Vitest's react-hooks/set-state-in-effect check happy -- see
  // features/linkedin/LinkedInCentre.tsx for the fuller explanation.
  useEffect(() => {
    getEvents().then((result) => {
      if (!result.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setEvents(result.data);
      setIsLoading(false);
    });
  }, []);

  function load() {
    setIsLoading(true);
    setHasError(false);
    getEvents().then((result) => {
      if (!result.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setEvents(result.data);
      setIsLoading(false);
    });
  }

  if (isLoading) {
    return <CentreLoadingSkeleton label="Loading events..." />;
  }

  if (hasError || !events) {
    return <ErrorState message="We couldn't load events right now." onRetry={load} />;
  }

  const upcoming = events
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const past = events
    .filter((event) => !isUpcoming(event))
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      <section>
        <h2 style={{ marginBottom: "1rem" }}>Upcoming Events</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            heading="No upcoming events"
            description="There are no upcoming events right now. Check back soon for new career events and webinars."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: "0.75rem" }}>Past Events</h2>
        {past.length === 0 ? (
          <p style={{ color: "var(--color-text-secondary)" }}>No past events yet.</p>
        ) : (
          <div className="card">
            {past.map((event) => (
              <PastEventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
