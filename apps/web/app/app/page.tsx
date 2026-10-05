import { redirect } from "next/navigation";

import { DashboardErrorState } from "@/features/dashboard/DashboardErrorState";
import { DashboardHeader } from "@/features/dashboard/DashboardHeader";
import { FutureModuleCard } from "@/features/dashboard/FutureModuleCard";
import { NextActionCard } from "@/features/dashboard/NextActionCard";
import { ProfileCompletionCard } from "@/features/dashboard/ProfileCompletionCard";
import { ProfileReadiness } from "@/features/dashboard/ProfileReadiness";
import { ResumeModuleCard } from "@/features/dashboard/ResumeModuleCard";
import { getServerDashboard } from "@/lib/candidate/backend";
import { getAccessToken } from "@/lib/auth/session";
import { getServerResumes } from "@/lib/resume/backend";

// Modules still genuinely unimplemented. Each renders the same honest
// "Coming soon" placeholder -- no fake data, no fake functionality --
// until its own phase actually implements it. Resume is no longer in
// this list: Phase 5 implemented it, so it gets a real status card
// instead (see ResumeModuleCard below).
const FUTURE_MODULES = ["LinkedIn", "Mock Interviews", "Events", "Career Coaching", "Jobs"];

export default async function CandidateDashboardPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const dashboard = await getServerDashboard(accessToken);
  const resumes = await getServerResumes(accessToken);
  const latestResume = resumes?.find((r) => r.is_latest) ?? null;

  if (!dashboard) {
    return (
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <DashboardHeader firstName={null} />
        <DashboardErrorState />
      </main>
    );
  }

  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <DashboardHeader firstName={dashboard.candidate.first_name} />

      <div
        style={{
          padding: "1.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
        }}
      >
        <ProfileCompletionCard
          percentage={dashboard.profile_completion.percentage}
          actionRoute={dashboard.next_action.route}
        />
        <NextActionCard action={dashboard.next_action} />
        <ProfileReadiness components={dashboard.profile_completion.components} />
      </div>

      <div style={{ padding: "0 1.5rem 1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>Coming up</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <ResumeModuleCard status={latestResume?.status ?? null} />
          {FUTURE_MODULES.map((title) => (
            <FutureModuleCard key={title} title={title} />
          ))}
        </div>
      </div>
    </main>
  );
}
