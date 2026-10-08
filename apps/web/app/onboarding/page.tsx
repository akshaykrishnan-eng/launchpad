import Link from "next/link";
import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { DashboardIcon, InterviewIcon, LinkedInIcon, ResumeIcon } from "@/components/icons";
import { ProgressRing } from "@/components/ProgressRing";
import { ModuleSummaryCard } from "@/features/dashboard/ModuleSummaryCard";
import { OnboardingJourney } from "@/features/onboarding/OnboardingJourney";
import { OnboardingOverviewError } from "@/features/onboarding/OnboardingOverviewError";
import {
  buildNextStepPanel,
  buildOnboardingJourney,
  buildPostOnboardingRecommendation,
  type PostOnboardingRecommendationType,
} from "@/features/onboarding/overview";
import { getServerDashboard } from "@/lib/candidate/backend";
import { getAccessToken } from "@/lib/auth/session";
import { getServerLinkedInProfile } from "@/lib/linkedin/backend";
import { getServerCredits } from "@/lib/mock-interviews/backend";
import { getServerResumes } from "@/lib/resume/backend";

const RECOMMENDATION_ICONS: Record<PostOnboardingRecommendationType, typeof ResumeIcon> = {
  RESUME: ResumeIcon,
  LINKEDIN: LinkedInIcon,
  INTERVIEW: InterviewIcon,
  DASHBOARD: DashboardIcon,
};

export default async function OnboardingOverviewPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const dashboard = await getServerDashboard(accessToken);

  if (!dashboard) {
    return (
      <div className="page page-narrow onboarding-page">
        <h1 className="visually-hidden">Onboarding</h1>
        <OnboardingOverviewError />
      </div>
    );
  }

  const { percentage, components } = dashboard.profile_completion;
  const journey = buildOnboardingJourney(components);
  const panel = buildNextStepPanel(journey, dashboard.next_action);
  const isFullyComplete = dashboard.next_action.type === "PROFILE_COMPLETE";
  const remaining = journey.steps.filter((step) => step.state !== "complete").length;

  // Only needed for the "what should I do next" recommendation below,
  // which only renders once onboarding itself is complete -- no need
  // to pay for these round trips while the candidate is still partway
  // through the guided steps.
  let recommendation = null;
  if (isFullyComplete) {
    const [resumes, linkedInProfile, credits] = await Promise.all([
      getServerResumes(accessToken),
      getServerLinkedInProfile(accessToken),
      getServerCredits(accessToken),
    ]);
    const hasResume = Boolean(resumes?.length);
    const hasLinkedIn = Boolean(linkedInProfile);
    const mockInterviewBalance = credits?.find((c) => c.credit_type === "MOCK_INTERVIEW")?.balance ?? 0;
    recommendation = buildPostOnboardingRecommendation(hasResume, hasLinkedIn, mockInterviewBalance > 0);
  }

  return (
    <div className="page page-narrow onboarding-page">
      <div>
        <BackLink href="/app">Back to Dashboard</BackLink>
      </div>

      <section className="hero-panel" aria-label="Onboarding progress">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative" }}>
            <p className="hero-eyebrow">Launchpad onboarding</p>
            <h1 className="hero-title">
              {isFullyComplete ? "Your profile is complete 🎉" : "Complete your Launchpad profile"}
            </h1>
            <p className="hero-subtitle">
              {isFullyComplete
                ? "Great start. Let's get your career profile ready for opportunities."
                : "Build your profile so Launchpad can better understand your background and career goals."}
            </p>
          </div>

          <ProgressRing percentage={percentage} label="Onboarding progress" size={76} />
        </div>

        {!isFullyComplete && (
          <div
            style={{
              position: "relative",
              marginTop: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              background: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              borderRadius: "var(--radius-md)",
              padding: "1rem 1.25rem",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {panel.eyebrow}
              </p>
              <p style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#fff", marginTop: "0.125rem" }}>
                {panel.title}
              </p>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.9375rem", marginTop: "0.125rem" }}>
                {panel.description}
              </p>
            </div>
            <Link href={panel.ctaHref} className="btn-primary hero-cta" style={{ flexShrink: 0 }}>
              {panel.ctaLabel}
            </Link>
          </div>
        )}
      </section>

      {recommendation && (
        <section aria-labelledby="recommended-next-step-heading">
          <div className="page-section-header" style={{ marginBottom: "0.75rem" }}>
            <h2 id="recommended-next-step-heading" className="page-section-title">
              Recommended next step
            </h2>
          </div>
          <div
            className="callout"
            style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                flexShrink: 0,
                width: "2.75rem",
                height: "2.75rem",
                borderRadius: "var(--radius-md)",
                background: "var(--color-primary-subtle)",
                color: "var(--color-primary-hover)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {(() => {
                const Icon = RECOMMENDATION_ICONS[recommendation.type];
                return <Icon aria-hidden />;
              })()}
            </span>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <h3 style={{ fontSize: "1.0625rem" }}>{recommendation.title}</h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem", marginTop: "0.25rem" }}>
                {recommendation.description}
              </p>
            </div>
            <Link href={recommendation.ctaHref} className="btn-primary" style={{ flexShrink: 0 }}>
              {recommendation.ctaLabel}
            </Link>
          </div>
        </section>
      )}

      <section aria-labelledby="onboarding-journey-heading">
        <div className="page-section-header" style={{ marginBottom: "0.75rem" }}>
          <h2 id="onboarding-journey-heading" className="page-section-title">
            Profile setup
          </h2>
          <span className="page-section-hint">
            {remaining === 0 ? "All steps complete" : `${remaining} step${remaining === 1 ? "" : "s"} remaining`}
          </span>
        </div>
        <OnboardingJourney steps={journey.steps} />
      </section>

      <section aria-labelledby="onboarding-explore-heading">
        <div className="page-section-header" style={{ marginBottom: "0.75rem" }}>
          <h2 id="onboarding-explore-heading" className="page-section-title">
            Explore Launchpad
          </h2>
          <span className="page-section-hint">Resume, LinkedIn, and interview prep -- ready whenever you are</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <ModuleSummaryCard
            href="/app/resume"
            icon={ResumeIcon}
            title="Resume Centre"
            status="Upload your resume and get expert feedback"
          />
          <ModuleSummaryCard
            href="/app/linkedin"
            icon={LinkedInIcon}
            title="LinkedIn Centre"
            status="Get your LinkedIn profile reviewed"
          />
          <ModuleSummaryCard
            href="/app/mock-interviews"
            icon={InterviewIcon}
            title="Mock Interviews"
            status="Book a practice interview with feedback"
          />
        </div>
        {isFullyComplete && (
          <div style={{ marginTop: "1rem" }}>
            <Link href="/app" style={{ fontWeight: 600 }}>
              Go to Dashboard →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
