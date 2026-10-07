export type NotificationType =
  | "EVENT_REGISTERED"
  | "MOCK_INTERVIEW_BOOKED"
  | "RESUME_REVIEW_COMPLETED"
  | "LINKEDIN_REVIEW_COMPLETED";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read_at: string | null;
  is_read: boolean;
  created_at: string;
};

export type UnreadCount = {
  unread_count: number;
};

export type MarkAllReadResult = {
  marked_read: number;
};

export type NotificationApiError = { detail?: string | { msg: string; loc: unknown[] }[] };
