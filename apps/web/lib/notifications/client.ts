import type { MarkAllReadResult, Notification, NotificationApiError, UnreadCount } from "@/lib/notifications/types";
import type { Page } from "@/lib/pagination";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

// Same tiny query-string builder as lib/credits/client.ts.
function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function cleanMessage(msg: string): string {
  return msg.replace(/^Value error,\s*/, "");
}

function errorMessage(body: NotificationApiError): string {
  if (!body.detail) return "Something went wrong. Please try again.";
  if (typeof body.detail === "string") return cleanMessage(body.detail);
  return body.detail.map((e) => cleanMessage(e.msg)).join("; ");
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`/api/candidate${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status, error: errorMessage(body) };
  }
  return { ok: true, data: body as T };
}

export const getNotifications = (params: { page?: number; page_size?: number } = {}) =>
  request<Page<Notification>>(`/notifications${query(params)}`);

export const getUnreadNotificationCount = () => request<UnreadCount>("/notifications/unread-count");

export const markNotificationRead = (notificationId: string) =>
  request<Notification>(`/notifications/${notificationId}/read`, { method: "POST" });

export const markAllNotificationsRead = () =>
  request<MarkAllReadResult>("/notifications/read-all", { method: "POST" });
