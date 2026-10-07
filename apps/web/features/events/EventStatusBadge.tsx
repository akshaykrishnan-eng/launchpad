import type { EventStatus } from "@/lib/events/types";

const LABELS: Record<EventStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Upcoming",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

const TONES: Record<EventStatus, string> = {
  DRAFT: "badge-neutral",
  PUBLISHED: "badge-info",
  CANCELLED: "badge-danger",
  COMPLETED: "badge-neutral",
};

/** Mirrors features/mock-interviews/MockInterviewStatusBadge.tsx's
 * visual language so Events reads as part of the same product. */
export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <span className={`badge ${TONES[status]}`}>{LABELS[status]}</span>;
}
