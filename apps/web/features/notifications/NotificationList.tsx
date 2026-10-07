"use client";

import { useRouter } from "next/navigation";
import type { ComponentType } from "react";

import {
  CalendarIcon,
  ChevronRightIcon,
  InterviewIcon,
  LinkedInIcon,
  ResumeIcon,
  type IconProps,
} from "@/components/icons";
import { getNotificationDestination } from "@/lib/notifications/destinations";
import { NOTIFICATION_TYPE_LABELS, formatNotificationTime } from "@/lib/notifications/labels";
import type { Notification, NotificationType } from "@/lib/notifications/types";

type NotificationListProps = {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
};

/** Every notification type gets a consistent icon container -- reusing
 * existing project icons, never a new icon library. A `Record` (not
 * `Partial`) so a new NotificationType added later is a compile error
 * here until it's given one. */
const NOTIFICATION_TYPE_ICONS: Record<NotificationType, ComponentType<IconProps>> = {
  EVENT_PUBLISHED: CalendarIcon,
  EVENT_REGISTERED: CalendarIcon,
  MOCK_INTERVIEW_BOOKED: InterviewIcon,
  RESUME_REVIEW_COMPLETED: ResumeIcon,
  LINKEDIN_REVIEW_COMPLETED: LinkedInIcon,
};

/** A single chronological feed (newest first), unread items visually
 * distinguished rather than split into separate unread/all tabs with
 * their own pagination -- one list is enough to "clearly communicate
 * title/message/timestamp/read-state" without doubling the interaction
 * surface (PRD section 10: avoid unnecessary interaction complexity).
 * Unread items are themselves the "mark as read" action (clicking one
 * opens/acknowledges it); already-read items without a click
 * destination are static rows.
 *
 * Each row is one CSS Grid item (icon / content / chevron, see
 * .notification-row in globals.css) that grows with its content --
 * no fixed heights, no absolute positioning, so wrapped titles/
 * messages/chips can never spill into the row below. */
export function NotificationList({ notifications, onMarkRead }: NotificationListProps) {
  const router = useRouter();

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) onMarkRead(notification.id);
    const destination = getNotificationDestination(notification);
    if (destination) router.push(destination);
  };

  return (
    <ul className="notification-list">
      {notifications.map((notification) => {
        const Icon = NOTIFICATION_TYPE_ICONS[notification.type];
        const destination = getNotificationDestination(notification);
        const isClickable = !notification.is_read || destination !== null;
        const rowClassName = `notification-row${notification.is_read ? "" : " notification-row-unread"}`;

        const content = (
          <>
            <span className="notification-icon" aria-hidden="true">
              <Icon width={18} height={18} />
            </span>
            <span className="notification-main">
              <span className="notification-title-row">
                {!notification.is_read && <span className="notification-dot" aria-hidden="true" />}
                <span className="notification-title">{notification.title}</span>
                <span className="notification-time">{formatNotificationTime(notification.created_at)}</span>
              </span>
              <span className="notification-message">{notification.message}</span>
              <span className="badge badge-neutral notification-chip">
                {NOTIFICATION_TYPE_LABELS[notification.type]}
              </span>
            </span>
            {isClickable && (
              <ChevronRightIcon aria-hidden="true" width={18} height={18} className="notification-chevron" />
            )}
          </>
        );

        if (!isClickable) {
          return (
            <li key={notification.id} className={rowClassName}>
              {content}
            </li>
          );
        }

        return (
          <li key={notification.id}>
            <button type="button" className={rowClassName} onClick={() => handleClick(notification)}>
              {content}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
