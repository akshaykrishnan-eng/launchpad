import Link from "next/link";

import { EVENT_TYPE_LABELS, formatEventDate, formatEventTime } from "@/lib/events/labels";
import type { Event } from "@/lib/events/types";

export function EventCard({ event }: { event: Event }) {
  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      <span className="badge badge-info" style={{ alignSelf: "flex-start" }}>
        {EVENT_TYPE_LABELS[event.event_type]}
      </span>
      <h3 style={{ margin: 0 }}>{event.title}</h3>
      <p
        style={{
          color: "var(--color-text-secondary)",
          margin: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {event.description}
      </p>
      <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-primary)" }}>
        {formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at, event.timezone)}
      </p>
      <div style={{ marginTop: "0.5rem" }}>
        {event.is_registered ? (
          <span className="badge badge-success">Registered ✓</span>
        ) : (
          <Link href={`/app/events/${event.id}`} className="btn-primary" style={{ display: "inline-flex" }}>
            View details
          </Link>
        )}
      </div>
    </section>
  );
}
