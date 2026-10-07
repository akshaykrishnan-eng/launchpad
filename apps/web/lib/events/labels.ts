import type { Event } from "@/lib/events/types";

export const EVENT_TYPE_LABELS: Record<Event["event_type"], string> = {
  WEBINAR: "Webinar",
  EVENT: "Event",
};

export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatEventTime(iso: string, timezone: string): string {
  const time = new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} ${timezone}`;
}

export function formatEventDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isPastEvent(event: Pick<Event, "status" | "ends_at">): boolean {
  return event.status === "COMPLETED" || event.status === "CANCELLED";
}
