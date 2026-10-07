import type { CSSProperties } from "react";

import { NOTIFICATION_TYPE_LABELS, formatNotificationTime } from "@/lib/notifications/labels";
import type { Notification } from "@/lib/notifications/types";

type NotificationListProps = {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
};

/** A single chronological feed (newest first), unread items visually
 * distinguished rather than split into separate unread/all tabs with
 * their own pagination -- one list is enough to "clearly communicate
 * title/message/timestamp/read-state" without doubling the interaction
 * surface (PRD section 10: avoid unnecessary interaction complexity).
 * Unread items are themselves the "mark as read" action (clicking one
 * opens/acknowledges it); already-read items are static rows. */
export function NotificationList({ notifications, onMarkRead }: NotificationListProps) {
  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {notifications.map((notification) => {
        const content = (
          <>
            <span
              aria-hidden="true"
              style={{
                width: "0.5rem",
                height: "0.5rem",
                borderRadius: "999px",
                marginTop: "0.5rem",
                flexShrink: 0,
                background: notification.is_read ? "transparent" : "var(--color-primary)",
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <p style={{ fontWeight: notification.is_read ? 500 : 700, color: "var(--color-text-primary)" }}>
                  {notification.title}
                </p>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                  {formatNotificationTime(notification.created_at)}
                </span>
              </div>
              <p style={{ color: "var(--color-text-secondary)", marginTop: "0.125rem" }}>{notification.message}</p>
              <span className="badge badge-neutral" style={{ marginTop: "0.5rem" }}>
                {NOTIFICATION_TYPE_LABELS[notification.type]}
              </span>
            </div>
          </>
        );

        const rowStyle: CSSProperties = {
          display: "flex",
          gap: "0.75rem",
          padding: "0.875rem 1rem",
          borderRadius: "var(--radius-md)",
          background: notification.is_read ? "transparent" : "var(--color-primary-subtle)",
          border: "1px solid var(--color-border-subtle)",
          textAlign: "left",
          width: "100%",
        };

        if (notification.is_read) {
          return (
            <li key={notification.id} style={rowStyle}>
              {content}
            </li>
          );
        }

        return (
          <li key={notification.id}>
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              style={{ ...rowStyle, cursor: "pointer", font: "inherit" }}
            >
              {content}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
