import Link from "next/link";

import { EVENT_TYPE_LABELS, formatEventDate } from "@/lib/events/labels";
import type { Event } from "@/lib/events/types";

export function PastEventRow({ event }: { event: Event }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        padding: "0.75rem 0",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div>
        <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-primary)" }}>{event.title}</p>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          {formatEventDate(event.starts_at)} · {EVENT_TYPE_LABELS[event.event_type]}
          {event.status === "CANCELLED" ? " · Cancelled" : ""}
        </p>
      </div>
      <Link href={`/app/events/${event.id}`} style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
        View details →
      </Link>
    </div>
  );
}
