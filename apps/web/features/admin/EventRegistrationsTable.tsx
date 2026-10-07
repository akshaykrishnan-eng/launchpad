import { formatEventDateTime } from "@/lib/events/labels";
import type { EventRegistrationAdminItem } from "@/lib/admin/types";

function candidateName(c: { first_name: string | null; last_name: string | null; email: string }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
}

export function EventRegistrationsTable({ items }: { items: EventRegistrationAdminItem[] }) {
  if (items.length === 0) {
    return (
      <section className="card card-dashed" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>No registrations yet.</p>
      </section>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th scope="col">Candidate</th>
              <th scope="col">Email</th>
              <th scope="col">Registered at</th>
            </tr>
          </thead>
          <tbody>
            {items.map((registration) => (
              <tr key={registration.id}>
                <td style={{ fontWeight: 600 }}>{candidateName(registration.candidate)}</td>
                <td>{registration.candidate.email}</td>
                <td style={{ whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>
                  {formatEventDateTime(registration.registered_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
