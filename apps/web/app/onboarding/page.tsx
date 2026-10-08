import Link from "next/link";
import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { DashboardIcon, InterviewIcon, LinkedInIcon, ResumeIcon } from "@/components/icons";
import { ProgressRing } from "@/components/ProgressRing";
import { OnboardingOverviewError } from "@/features/onboarding/OnboardingOverviewError";
import {
  buildNextStepPanel,
  buildOnboardingJourney,
  buildPostOnboardingRecommendation,
  type PostOnboardingRecommendationType,
} from "@/features/onboarding/overview";
import { ONBOARDING_STEPS } from "@/features/onboarding/steps";
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
      <div className="page onboarding-page">
        <h1 className="visually-hidden">Onboarding</h1>
        <OnboardingOverviewError />
      </div>
    );
  }

  const { percentage, components } = dashboard.profile_completion;
  const journey = buildOnboardingJourney(components);
  const panel = buildNextStepPanel(journey, dashboard.next_action);
  const isFullyComplete = dashboard.next_action.type === "PROFILE_COMPLETE";
  const completedCount = journey.steps.filter((s) => s.state === "complete").length;

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
    <div className="page onboarding-page onboarding-hub-page">
      {/* Back to Dashboard — only for candidates who have completed onboarding */}
      {isFullyComplete && (
        <div>
          <BackLink href="/app">Back to Dashboard</BackLink>
        </div>
      )}

      {/* Page header */}
      <div>
        <p className="step-eyebrow">Launchpad Onboarding</p>
        <h1 className="onboarding-hub-heading">
          {isFullyComplete ? "Your profile is complete 🎉" : "Let's build your Launchpad profile"}
        </h1>
        <p className="onboarding-hub-subheading">
          {isFullyComplete
            ? "Great start. Let's get your career profile ready for opportunities."
            : "Tell us about your background and career goals so we can personalize your Launchpad experience."}
        </p>
      </div>

      {/* Two-column: current step card + progress sidebar */}
      {!isFullyComplete && (
        <div className="onboarding-hub-layout">
          {/* LEFT: Current step card */}
          <div className="card onboarding-hub-step-card">
            <p className="step-eyebrow">
              Step {journey.currentIndex + 1} of {ONBOARDING_STEPS.length}
            </p>
            <h2 className="onboarding-hub-step-title">{panel.title}</h2>
            <p className="onboarding-hub-step-description">{panel.description}</p>
            <div style={{ marginTop: "1.75rem" }}>
              <Link href={panel.ctaHref} className="btn-primary">
                {panel.ctaLabel}
              </Link>
            </div>
          </div>

          {/* RIGHT: Progress sidebar */}
          <div className="card onboarding-hub-progress">
            <div className="onboarding-hub-progress-header">
              <div>
                <h2 className="onboarding-hub-progress-title">Your progress</h2>
                <p className="onboarding-hub-progress-count">
                  {percentage}% profile complete
                </p>
                <p className="onboarding-hub-progress-count" style={{ marginTop: "0.125rem" }}>
                  {completedCount} of {ONBOARDING_STEPS.length} sections completed
                </p>
              </div>
              <ProgressRing percentage={percentage} label="Onboarding progress" size={60} />
            </div>
            <ol className="onboarding-rail-steps" aria-label="Onboarding steps">
              {journey.steps.map((step) => (
                <li key={step.path} className="onboarding-hub-step-list-item" data-state={step.state}>
                  <Link href={step.path} className="onboarding-hub-step-link">
                    <span className="onboarding-rail-step-marker" aria-hidden="true">
                      {step.state === "complete" ? "✓" : ""}
                    </span>
                    <div className="onboarding-rail-step-text">
                      <span className="onboarding-rail-step-label">{step.label}</span>
                      <span className="onboarding-rail-step-caption">
                        {step.state === "complete"
                          ? "Completed"
                          : step.state === "current"
                            ? "Your next step"
                            : "Up next"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Post-completion recommendation (complete candidates only) */}
      {recommendation && (
        <section aria-labelledby="recommended-next-step-heading">
          <div className="page-section-header" style={{ marginBottom: "0.75rem" }}>
            <h2 id="recommended-next-step-heading" className="page-section-title">
              Recommended next step
            </h2>
          </div>
          <div className="callout" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
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

      {/* Career Assets */}
      <section aria-labelledby="career-assets-heading">
        <div className="page-section-header" style={{ marginBottom: "0.25rem" }}>
          <h2 id="career-assets-heading" className="page-section-title">
            Career Assets
          </h2>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--color-text-muted)",
              background: "var(--color-surface-muted)",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.125rem 0.5rem",
            }}
          >
            Optional
          </span>
        </div>
        <p className="page-section-hint" style={{ marginBottom: "1rem" }}>
          Add these when you&apos;re ready. They help you get more value from Launchpad.
        </p>
        <div className="onboarding-hub-assets-grid">
          {/* Resume Centre */}
          <div className="card onboarding-hub-asset-card">
            <div className="onboarding-hub-asset-body">
              <span className="onboarding-hub-asset-icon" aria-hidden="true">
                <ResumeIcon />
              </span>
              <div>
                <h3 className="onboarding-hub-asset-title">Resume Centre</h3>
                <p className="onboarding-hub-asset-description">
                  Upload your resume and get professional feedback to improve it.
                </p>
              </div>
            </div>
            <div className="onboarding-hub-asset-actions">
              <Link href="/app/resume" className="btn-primary btn-sm">
                Go to Resume Centre
              </Link>
              <button type="button" className="btn-sm" disabled>
                Add later
              </button>
            </div>
          </div>

          {/* LinkedIn Centre */}
          <div className="card onboarding-hub-asset-card">
            <div className="onboarding-hub-asset-body">
              <span className="onboarding-hub-asset-icon" aria-hidden="true">
                <LinkedInIcon />
              </span>
              <div>
                <h3 className="onboarding-hub-asset-title">LinkedIn Centre</h3>
                <p className="onboarding-hub-asset-description">
                  Add your LinkedIn profile and get a profile review.
                </p>
              </div>
            </div>
            <div className="onboarding-hub-asset-actions">
              <Link href="/app/linkedin" className="btn-primary btn-sm">
                Go to LinkedIn Centre
              </Link>
              <button type="button" className="btn-sm" disabled>
                Add later
              </button>
            </div>
          </div>
        </div>

        {isFullyComplete && (
          <div style={{ marginTop: "1rem" }}>
            <Link href="/app" style={{ fontWeight: 600 }}>
              Go to Dashboard →
            </Link>
          </div>
        )}
      </section>

      {/* Footer */}
      <p
        style={{
          textAlign: "center",
          fontSize: "0.8125rem",
          color: "var(--color-text-muted)",
          marginTop: "0.5rem",
        }}
      >
        <span aria-hidden="true" style={{ marginRight: "0.375rem" }}>
          ✦
        </span>
        You can update your profile anytime from your dashboard.
      </p>
    </div>
  );
}
