export type EventType = "WEBINAR" | "EVENT";

export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";

export type Event = {
  id: string;
  title: string;
  description: string;
  event_type: EventType;
  status: EventStatus;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location: string | null;
  meeting_url: string | null;
  is_registered: boolean;
};

export type EventRegisterResponse = {
  event_id: string;
  registered: boolean;
  registered_at: string;
};

export type EventApiError = { detail?: string | { msg: string; loc: unknown[] }[] };
