import type { NotificationType } from "@/lib/notifications/types";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  EVENT_REGISTERED: "Event",
  MOCK_INTERVIEW_BOOKED: "Mock Interview",
  RESUME_REVIEW_COMPLETED: "Resume Review",
  LINKEDIN_REVIEW_COMPLETED: "LinkedIn Review",
};

/** Relative for anything recent (the common case for a notification
 * feed), falling back to an absolute date once it's more than a week
 * old -- "2 hours ago" is useful, "3 weeks ago" is not. */
export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
