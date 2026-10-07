import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { ResumeStatusBadge } from "@/features/resume/ResumeStatusBadge";
import { LinkedInReviewStatusBadge } from "@/features/linkedin/LinkedInReviewStatusBadge";
import { MockInterviewStatusBadge } from "@/features/mock-interviews/MockInterviewStatusBadge";
import { getServerCandidate360 } from "@/lib/admin/backend";
import { getAccessToken } from "@/lib/auth/session";
import { interviewTitle, formatDateTime } from "@/lib/mock-interviews/labels";
import type { ReviewRequestStatus } from "@/lib/linkedin/types";
import type { ResumeStatus } from "@/lib/resume/types";

type PageProps = { params: Promise<{ id: string }> };

const CREDIT_LABELS: Record<string, string> = {
  MOCK_INTERVIEW: "Mock Interview",
  CAREER_COACHING: "Career Coaching",
  RESUME_REVIEW: "Resume Review",
  LINKEDIN_REVIEW: "LinkedIn Review",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function Candidate360Page({ params }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { id } = await params;
  const data = await getServerCandidate360(accessToken, id);
  if (!data) {
    notFound();
  }

  const { candidate, profile, education, skills, experience, career_preferences, resume, resume_review, linkedin, linkedin_review, interviews, credits } = data;
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || candidate.email;

  return (
    <>
      <PageHeader
        title={fullName}
        description={`${candidate.email} · Profile completion: ${profile.completion_percentage}%`}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Profile</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
            <Field label="Mobile number" value={profile.mobile_number} />
            <Field label="Current city" value={profile.current_city} />
            <Field label="Current status" value={profile.current_status} />
            <Field label="Degree" value={profile.degree} />
            <Field label="Specialisation" value={profile.specialisation} />
            <Field label="Graduation year" value={profile.graduation_year?.toString() ?? null} />
          </div>
          {profile.career_goal && (
            <div style={{ marginTop: "0.875rem" }}>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Career goal</p>
              <p style={{ marginTop: "0.125rem" }}>{profile.career_goal}</p>
            </div>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Education</h2>
          {education.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>Not completed yet.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {education.map((e) => (
                <li key={e.id}>
                  {e.degree} in {e.specialization ?? "—"}, {e.institution}
                  {e.graduation_year ? ` (${e.graduation_year})` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Skills</h2>
          {skills.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>Not completed yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {skills.map((s) => (
                <span key={s.id} className="badge badge-neutral">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Work Experience</h2>
          {experience.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>Not completed yet.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {experience.map((e) => (
                <li key={e.id}>
                  {e.job_title} at {e.company}
                  {e.is_current ? " (current)" : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Career Preferences</h2>
          {career_preferences.preferred_roles.length === 0 && career_preferences.preferred_locations.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>Not completed yet.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <li>Roles: {career_preferences.preferred_roles.join(", ") || "—"}</li>
              <li>Locations: {career_preferences.preferred_locations.join(", ") || "—"}</li>
            </ul>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Resume</h2>
          {!resume ? (
            <p style={{ color: "var(--color-text-secondary)" }}>No resume uploaded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <p style={{ fontWeight: 600 }}>
                {resume.original_filename} <span style={{ fontWeight: 400, color: "var(--color-text-secondary)" }}>(v{resume.version})</span>
              </p>
              <div>
                <ResumeStatusBadge status={resume.status as ResumeStatus} />
              </div>
              {resume_review && (
                <>
                  {resume_review.result ? (
                    <div>
                      <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Score</p>
                      <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{resume_review.result.score ?? "—"}</p>
                      <p style={{ marginTop: "0.375rem" }}>{resume_review.result.summary}</p>
                    </div>
                  ) : (
                    <Link href="/admin/resume-reviews" className="btn-primary" style={{ display: "inline-flex", alignSelf: "flex-start" }}>
                      Review Resume
                    </Link>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>LinkedIn</h2>
          {!linkedin ? (
            <p style={{ color: "var(--color-text-secondary)" }}>No LinkedIn profile added yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <a href={linkedin.profile_url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                {linkedin.profile_url.replace(/^https?:\/\//, "")}
              </a>
              {linkedin_review && (
                <>
                  <div>
                    <LinkedInReviewStatusBadge status={linkedin_review.status as ReviewRequestStatus} />
                  </div>
                  {linkedin_review.result ? (
                    <div>
                      <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Score</p>
                      <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{linkedin_review.result.score ?? "—"}</p>
                      <p style={{ marginTop: "0.375rem" }}>{linkedin_review.result.summary}</p>
                    </div>
                  ) : (
                    <Link href="/admin/linkedin-reviews" className="btn-primary" style={{ display: "inline-flex", alignSelf: "flex-start" }}>
                      Open LinkedIn Review
                    </Link>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Mock Interviews</h2>
          {interviews.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>No mock interviews booked yet.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {interviews.map((interview) => (
                <li key={interview.id} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600 }}>{interviewTitle(interview)}</span>
                    <MockInterviewStatusBadge status={interview.status} />
                  </div>
                  <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                    {formatDateTime(interview.scheduled_at)}
                    {interview.feedback && ` · Score: ${interview.feedback.overall_score}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Credits</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
            {credits.map((balance) => (
              <div key={balance.credit_type} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "1rem" }}>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                  {CREDIT_LABELS[balance.credit_type] ?? balance.credit_type}
                </p>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.125rem" }}>{balance.balance}</p>
              </div>
            ))}
          </div>
          <Link
            href={`/admin/credits?candidate_id=${candidate.id}`}
            className="btn-primary"
            style={{ display: "inline-flex", marginTop: "0.875rem" }}
          >
            Grant Credits
          </Link>
        </section>

        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          Registered {formatDate(candidate.created_at)}
          {candidate.last_login_at && ` · Last login ${formatDate(candidate.last_login_at)}`}
        </p>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>{label}</p>
      <p style={{ marginTop: "0.125rem" }}>{value || "—"}</p>
    </div>
  );
}
