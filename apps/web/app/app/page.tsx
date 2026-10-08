import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { DashboardErrorState } from "@/features/dashboard/DashboardErrorState";
import { DashboardHero } from "@/features/dashboard/DashboardHero";
import { FutureModuleCard } from "@/features/dashboard/FutureModuleCard";
import { MockInterviewModuleCard } from "@/features/dashboard/MockInterviewModuleCard";
import { ProfileReadiness } from "@/features/dashboard/ProfileReadiness";
import { LinkedInModuleCard } from "@/features/dashboard/LinkedInModuleCard";
import { RecommendedNextStep } from "@/features/dashboard/RecommendedNextStep";
import { ResumeModuleCard } from "@/features/dashboard/ResumeModuleCard";
import { getServerDashboard } from "@/lib/candidate/backend";
import { getAccessToken } from "@/lib/auth/session";
import { getServerLinkedInProfile, getServerLinkedInReview } from "@/lib/linkedin/backend";
import { getServerCredits, getServerMockInterviews } from "@/lib/mock-interviews/backend";
import { getServerResumes } from "@/lib/resume/backend";

// Modules still genuinely unimplemented. Each renders the same honest
// "Coming soon" placeholder -- no fake data, no fake functionality --
// until its own phase actually implements it. Resume, LinkedIn, and
// Mock Interviews are no longer in this list: their phases implemented
// them, so they get real status cards instead (see
// ResumeModuleCard/LinkedInModuleCard/MockInterviewModuleCard). Events
// is reused elsewhere and will get its own "Upcoming Events" dashboard
// section in a later pass; it isn't part of Quick Actions.
const FUTURE_MODULES = ["Career Coaching", "Jobs"];

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

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
  // Independent of each other, so fetched together rather than adding
  // another sequential round trip.
  const [credits, mockInterviews] = await Promise.all([
    getServerCredits(accessToken),
    getServerMockInterviews(accessToken),
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
  const isProfileComplete = dashboard.next_action.type === "PROFILE_COMPLETE";

  return (
    <div className="page">
      <PageHeader
        title={`${timeOfDayGreeting()}${firstName ? `, ${firstName}` : ""}! 👋`}
        description="Let's keep building your career with Launchpad."
      />

      <DashboardHero
        percentage={dashboard.profile_completion.percentage}
        action={dashboard.next_action}
      />

      {!isProfileComplete && <RecommendedNextStep action={dashboard.next_action} />}

      <ProfileReadiness components={dashboard.profile_completion.components} />

      <section className="page-section">
        <div className="page-section-header">
          <h2 className="page-section-title">Quick Actions</h2>
          <span className="page-section-hint">Get started with the key features of Launchpad.</span>
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
