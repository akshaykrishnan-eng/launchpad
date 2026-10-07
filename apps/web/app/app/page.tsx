import { redirect } from "next/navigation";

import { DashboardErrorState } from "@/features/dashboard/DashboardErrorState";
import { DashboardHero } from "@/features/dashboard/DashboardHero";
import { EventsModuleCard } from "@/features/dashboard/EventsModuleCard";
import { FutureModuleCard } from "@/features/dashboard/FutureModuleCard";
import { MockInterviewModuleCard } from "@/features/dashboard/MockInterviewModuleCard";
import { ProfileReadiness } from "@/features/dashboard/ProfileReadiness";
import { LinkedInModuleCard } from "@/features/dashboard/LinkedInModuleCard";
import { ResumeModuleCard } from "@/features/dashboard/ResumeModuleCard";
import { getServerDashboard } from "@/lib/candidate/backend";
import { getAccessToken } from "@/lib/auth/session";
import { getServerEvents } from "@/lib/events/backend";
import { getServerLinkedInProfile, getServerLinkedInReview } from "@/lib/linkedin/backend";
import { getServerCredits, getServerMockInterviews } from "@/lib/mock-interviews/backend";
import { getServerResumes } from "@/lib/resume/backend";

// Modules still genuinely unimplemented. Each renders the same honest
// "Coming soon" placeholder -- no fake data, no fake functionality --
// until its own phase actually implements it. Resume, LinkedIn, Mock
// Interviews, and Events are no longer in this list: their phases
// implemented them, so they get real status cards instead (see
// ResumeModuleCard/LinkedInModuleCard/MockInterviewModuleCard/
// EventsModuleCard).
const FUTURE_MODULES = ["Career Coaching", "Jobs"];

export default async function CandidateDashboardPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const dashboard = await getServerDashboard(accessToken);
  const resumes = await getServerResumes(accessToken);
  const latestResume = resumes?.find((r) => r.is_latest) ?? null;
  const linkedInProfile = await getServerLinkedInProfile(accessToken);
  const linkedInReview = linkedInProfile ? await getServerLinkedInReview(accessToken) : null;
  // Independent of each other and of everything above, so fetched
  // together rather than adding two more sequential round trips.
  const [credits, mockInterviews, events] = await Promise.all([
    getServerCredits(accessToken),
    getServerMockInterviews(accessToken),
    getServerEvents(accessToken),
  ]);
  const mockInterviewBalance =
    credits?.find((c) => c.credit_type === "MOCK_INTERVIEW")?.balance ?? 0;

  if (!dashboard) {
    return (
      <div className="page">
        <h1 className="visually-hidden">Dashboard</h1>
        <DashboardErrorState />
      </div>
    );
  }

  const firstName = dashboard.candidate.first_name;

  return (
    <div className="page">
      <DashboardHero
        firstName={firstName}
        percentage={dashboard.profile_completion.percentage}
        action={dashboard.next_action}
      />

      <ProfileReadiness components={dashboard.profile_completion.components} />

      <section className="page-section">
        <div className="page-section-header">
          <h2 className="page-section-title">Career tools</h2>
          <span className="page-section-hint">What&apos;s available to you right now</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          <ResumeModuleCard status={latestResume?.status ?? null} />
          <LinkedInModuleCard
            hasProfile={Boolean(linkedInProfile)}
            reviewStatus={linkedInReview?.status ?? null}
          />
          <MockInterviewModuleCard
            mockInterviewBalance={mockInterviewBalance}
            interviews={mockInterviews ?? []}
          />
          <EventsModuleCard events={events ?? []} />
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">More from Launchpad</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {FUTURE_MODULES.map((title) => (
            <FutureModuleCard key={title} title={title} />
          ))}
        </div>
      </section>
    </div>
  );
}
