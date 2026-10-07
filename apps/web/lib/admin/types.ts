import type { CreditBalance, CreditTransaction, CreditType } from "@/lib/mock-interviews/types";
import type { InterviewFeedback, InterviewType, MockInterview } from "@/lib/mock-interviews/types";

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

// --- Candidates ----------------------------------------------------------

export type CandidateListItem = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  current_status: string | null;
  completion_percentage: number;
  created_at: string;
};

export type CandidateSummary = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

export type AdminCandidateIdentity = {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

export type AdminCandidateProfile = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  mobile_number: string | null;
  current_city: string | null;
  current_status: string | null;
  degree: string | null;
  specialisation: string | null;
  graduation_year: number | null;
  career_goal: string | null;
  completion_percentage: number;
};

export type AdminEducation = {
  id: string;
  institution: string;
  degree: string;
  specialization: string | null;
  start_year: number | null;
  graduation_year: number | null;
  education_status: string | null;
};

export type AdminSkill = { id: string; name: string };

export type AdminExperience = {
  id: string;
  company: string;
  job_title: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
};

export type AdminCareerPreferences = {
  preferred_roles: string[];
  preferred_locations: string[];
};

export type AdminResume = {
  id: string;
  version: number;
  original_filename: string;
  content_type: string;
  file_size: number;
  status: string;
  uploaded_at: string;
  is_latest: boolean;
};

export type AdminReviewResult = {
  score: number | null;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  reviewer_type: string;
  created_at: string;
};

export type AdminReviewRequest = {
  id: string;
  resume_id: string;
  status: string;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  result: AdminReviewResult | null;
};

export type AdminLinkedInProfile = {
  id: string;
  profile_url: string;
  created_at: string;
  updated_at: string;
};

export type AdminLinkedInReviewRequest = {
  id: string;
  status: string;
  profile_url_snapshot: string;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  result: AdminReviewResult | null;
};

export type Candidate360 = {
  candidate: AdminCandidateIdentity;
  profile: AdminCandidateProfile;
  education: AdminEducation[];
  skills: AdminSkill[];
  experience: AdminExperience[];
  career_preferences: AdminCareerPreferences;
  resume: AdminResume | null;
  resume_review: AdminReviewRequest | null;
  linkedin: AdminLinkedInProfile | null;
  linkedin_review: AdminLinkedInReviewRequest | null;
  interviews: MockInterview[];
  credits: CreditBalance[];
};

// --- Review queues ---------------------------------------------------

export type ResumeReviewQueueItem = {
  review: AdminReviewRequest;
  candidate: CandidateSummary;
  resume_version: number;
  resume_filename: string;
};

export type LinkedInReviewQueueItem = {
  review: AdminLinkedInReviewRequest;
  candidate: CandidateSummary;
};

export type CompleteReviewPayload = {
  score: number | null;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
};

// --- Mock interviews / slots --------------------------------------------

export type MockInterviewAdminItem = {
  interview: MockInterview;
  candidate: CandidateSummary;
};

export type AdminInterviewSlot = {
  id: string;
  interview_type: InterviewType;
  starts_at: string;
  ends_at: string;
  status: "OPEN" | "BOOKED" | "CANCELLED";
};

export type CreateSlotPayload = {
  interview_type: InterviewType;
  starts_at: string;
  ends_at: string;
};

export type CompleteInterviewPayload = {
  communication_score: number;
  confidence_score: number;
  technical_score: number;
  answer_structure_score: number;
  professional_presentation_score: number;
  overall_score: number;
  feedback: string;
  recommendations: string[];
};

export type { InterviewFeedback };

// --- Events ----------------------------------------------------------------

export type AdminEventType = "WEBINAR" | "EVENT";
export type AdminEventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";

export type AdminEventItem = {
  id: string;
  title: string;
  description: string;
  event_type: AdminEventType;
  status: AdminEventStatus;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location: string | null;
  meeting_url: string | null;
  registration_count: number;
};

export type EventRegistrationAdminItem = {
  id: string;
  registered_at: string;
  candidate: CandidateSummary;
};

export type CreateEventPayload = {
  title: string;
  description: string;
  event_type: AdminEventType;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location?: string | null;
  meeting_url?: string | null;
  status: AdminEventStatus;
};

export type UpdateEventPayload = Partial<
  Omit<CreateEventPayload, "status">
>;

// --- Credits ---------------------------------------------------------------

export type GrantCreditPayload = {
  candidate_id: string;
  credit_type: CreditType;
  amount: number;
  reason: string;
  description?: string | null;
};

export type CreditGrantTransaction = {
  transaction: CreditTransaction;
  candidate: CandidateSummary;
};

// --- Dashboard -----------------------------------------------------------

export type AdminDashboardMetrics = {
  total_candidates: number;
  pending_resume_reviews: number;
  pending_linkedin_reviews: number;
  upcoming_interviews: number;
  completed_interviews: number;
  total_credit_transactions: number;
};

export type RecentCandidate = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
};

export type AdminDashboard = {
  metrics: AdminDashboardMetrics;
  recent_candidates: RecentCandidate[];
  recent_resume_reviews: ResumeReviewQueueItem[];
  recent_linkedin_reviews: LinkedInReviewQueueItem[];
};

export type AdminApiError = {
  detail?: string | { msg: string; loc: unknown[] }[];
};
