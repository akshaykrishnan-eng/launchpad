import Link from "next/link";

import { EventStatusBadge } from "@/features/events/EventStatusBadge";
import { formatEventDateTime } from "@/lib/events/labels";
import type { AdminEventItem } from "@/lib/admin/types";

export function AdminEventTable({ items }: { items: AdminEventItem[] }) {
  if (items.length === 0) {
    return (
      <section className="card card-dashed" style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 600 }}>No events yet</p>
        <p style={{ color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
          Create an event or webinar to see it listed here.
        </p>
      </section>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Type</th>
              <th scope="col">Starts</th>
              <th scope="col">Status</th>
              <th scope="col">Registrations</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((event) => (
              <tr key={event.id}>
                <td style={{ fontWeight: 600 }}>{event.title}</td>
                <td>{event.event_type}</td>
                <td style={{ whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>
                  {formatEventDateTime(event.starts_at)}
                </td>
                <td>
                  <EventStatusBadge status={event.status} />
                </td>
                <td>{event.registration_count}</td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/admin/events/${event.id}`} style={{ fontWeight: 600 }}>
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
