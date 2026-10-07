import type { Event, EventApiError, EventRegisterResponse } from "@/lib/events/types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

// Pydantic prefixes a field_validator's raised ValueError message with
// "Value error, " -- see lib/linkedin/client.ts for the original fix.
function cleanMessage(msg: string): string {
  return msg.replace(/^Value error,\s*/, "");
}

function errorMessage(body: EventApiError): string {
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

export const getEvents = () => request<Event[]>("/events");

export const getEvent = (eventId: string) => request<Event>(`/events/${eventId}`);

export const registerForEvent = (eventId: string) =>
  request<EventRegisterResponse>(`/events/${eventId}/register`, { method: "POST" });
