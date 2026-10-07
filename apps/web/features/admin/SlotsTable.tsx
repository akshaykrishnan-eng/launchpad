import type { AdminInterviewSlot } from "@/lib/admin/types";
import { INTERVIEW_TYPE_LABELS, formatDateTime } from "@/lib/mock-interviews/labels";

const STATUS_TONE: Record<string, string> = {
  OPEN: "badge-success",
  BOOKED: "badge-warning",
  CANCELLED: "badge-neutral",
};

export function SlotsTable({ slots }: { slots: AdminInterviewSlot[] }) {
  if (slots.length === 0) {
    return (
      <section className="card card-dashed" style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 600 }}>No interview slots yet</p>
        <p style={{ color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
          Create one above to let candidates book it.
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
              <th scope="col">Type</th>
              <th scope="col">Start</th>
              <th scope="col">End</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id}>
                <td>{INTERVIEW_TYPE_LABELS[slot.interview_type]}</td>
                <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(slot.starts_at)}</td>
                <td style={{ whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>
                  {formatDateTime(slot.ends_at)}
                </td>
                <td>
                  <span className={`badge ${STATUS_TONE[slot.status] ?? "badge-neutral"}`}>{slot.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
