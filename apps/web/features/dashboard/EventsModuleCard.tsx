import { CalendarIcon } from "@/components/icons";
import { ModuleSummaryCard } from "@/features/dashboard/ModuleSummaryCard";
import { formatEventDate } from "@/lib/events/labels";
import type { Event } from "@/lib/events/types";

function label(events: Event[]): string {
  const nextUpcoming = events
    .filter((e) => e.status === "PUBLISHED")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
  if (nextUpcoming) {
    return `Next: ${nextUpcoming.title} · ${formatEventDate(nextUpcoming.starts_at)}`;
  }
  return "No upcoming events";
}

export function EventsModuleCard({ events }: { events: Event[] }) {
  return (
    <ModuleSummaryCard href="/app/events" icon={CalendarIcon} title="Events & Webinars" status={label(events)} />
  );
}
