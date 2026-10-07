import type { Notification, NotificationType } from "@/lib/notifications/types";

/** notification-type -> destination route, rather than hardcoded
 * per-notification routing logic in the list UI. Only EVENT_PUBLISHED
 * has a destination today; every other type is purely informational
 * (click = mark as read, no navigation). */
const NOTIFICATION_DESTINATIONS: Partial<
  Record<NotificationType, (notification: Notification) => string | null>
> = {
  EVENT_PUBLISHED: (notification) =>
    notification.event_id ? `/app/events/${notification.event_id}` : null,
};

export function getNotificationDestination(notification: Notification): string | null {
  const resolve = NOTIFICATION_DESTINATIONS[notification.type];
  return resolve ? resolve(notification) : null;
}
