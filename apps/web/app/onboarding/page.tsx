import Link from "next/link";
import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  BuildingIcon,
  DashboardIcon,
  GraduationCapIcon,
  InterviewIcon,
  LinkedInIcon,
  ProfileIcon,
  ResumeIcon,
  RocketIcon,
  SearchIcon,
  SparkleIcon,
  StarIcon,
  TargetIcon,
} from "@/components/icons";
import type { IconProps } from "@/components/icons";
import { ProgressRing } from "@/components/ProgressRing";
import { OnboardingOverviewError } from "@/features/onboarding/OnboardingOverviewError";
import {
  buildNextStepPanel,
  buildOnboardingJourney,
  buildPostOnboardingRecommendation,
  type BenefitRow,
  type PostOnboardingRecommendationType,
} from "@/features/onboarding/overview";
import { ONBOARDING_STEPS } from "@/features/onboarding/steps";
import { getServerDashboard } from "@/lib/candidate/backend";
import { getAccessToken } from "@/lib/auth/session";
import { getServerLinkedInProfile } from "@/lib/linkedin/backend";
import { getServerCredits } from "@/lib/mock-interviews/backend";
import { getServerResumes } from "@/lib/resume/backend";

type IconName = BenefitRow["icon"];

const BENEFIT_ICON_MAP: Record<IconName, (props: IconProps) => React.ReactElement> = {
  profile: (p) => <ProfileIcon {...p} />,
  graduation: (p) => <GraduationCapIcon {...p} />,
  star: (p) => <StarIcon {...p} />,
  target: (p) => <TargetIcon {...p} />,
  briefcase: (p) => <BriefcaseIcon {...p} />,
  building: (p) => <BuildingIcon {...p} />,
  rocket: (p) => <RocketIcon {...p} />,
  sparkle: (p) => <SparkleIcon {...p} />,
  search: (p) => <SearchIcon {...p} />,
};

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
  const journey = buildOnboardingJourney(components, dashboard.next_action);
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
      {/* Back to Dashboard — only shown once onboarding is complete.
          The onboarding hub is a guided flow: showing a back-link for
          incomplete candidates disrupts the forward momentum, and the
          dashboard already surfaces a "Continue setup" banner for anyone
          who navigated there directly. */}
      {isFullyComplete && (
        <div>
          <BackLink href="/app">Back to Dashboard</BackLink>
        </div>
      )}

      {/* Page header */}
      <div className="onboarding-hub-page-header">
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
            <p className="step-eyebrow onboarding-hub-step-eyebrow">{panel.eyebrow}</p>
            <h2 className="onboarding-hub-step-title">{panel.title}</h2>
            <p className="onboarding-hub-step-description">{panel.description}</p>

            {panel.benefits.length > 0 && (
              <ul className="onboarding-benefit-rows" aria-label="Why this step matters">
                {panel.benefits.map((benefit) => {
                  const BenefitIcon = BENEFIT_ICON_MAP[benefit.icon];
                  return (
                    <li key={benefit.heading} className="onboarding-benefit-row">
                      <span className="onboarding-benefit-icon" aria-hidden="true">
                        <BenefitIcon />
                      </span>
                      <div className="onboarding-benefit-content">
                        <span className="onboarding-benefit-heading">{benefit.heading}</span>
                        <span className="onboarding-benefit-description">{benefit.description}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="onboarding-hub-step-cta">
              <Link href={panel.ctaHref} className="btn-primary">
                {panel.ctaLabel}
                <ArrowRightIcon aria-hidden style={{ width: "1rem", height: "1rem" }} />
              </Link>
            </div>
          </div>

          {/* RIGHT: Progress card */}
          <div className="card onboarding-hub-progress">
            <div className="onboarding-hub-progress-header">
              <div>
                <h2 className="onboarding-hub-progress-title">Your progress</h2>
                <p className="onboarding-hub-progress-count">
                  {completedCount} of {ONBOARDING_STEPS.length} steps complete
                </p>
              </div>
              <ProgressRing percentage={percentage} label="Onboarding progress" size={56} />
            </div>

            <ol className="onboarding-hub-steps" aria-label="Onboarding steps">
              {journey.steps.map((step, index) => (
                <li key={step.path} className="onboarding-hub-step-item" data-state={step.state}>
                  <div className="onboarding-hub-step-connector" aria-hidden="true" />
                  <Link href={step.path} className="onboarding-hub-step-row">
                    <span className="onboarding-hub-step-marker" aria-hidden="true">
                      {step.state === "complete" ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="onboarding-hub-step-number">{index + 1}</span>
                      )}
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
              <div style={{ flex: 1 }}>
                <h3 className="onboarding-hub-asset-title">Resume Centre</h3>
                <p className="onboarding-hub-asset-description">
                  Upload your resume and get professional feedback to improve it.
                </p>
              </div>
              <ArrowRightIcon
                aria-hidden
                style={{ color: "var(--color-text-muted)", flexShrink: 0, width: "1.125rem", height: "1.125rem" }}
              />
            </div>
            <div className="onboarding-hub-asset-actions">
              <Link href="/app/resume" className="btn-outline btn-sm">
                Add resume
              </Link>
              <button type="button" className="btn-ghost btn-sm" disabled>
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
              <div style={{ flex: 1 }}>
                <h3 className="onboarding-hub-asset-title">LinkedIn Centre</h3>
                <p className="onboarding-hub-asset-description">
                  Add your LinkedIn profile and get a profile review.
                </p>
              </div>
              <ArrowRightIcon
                aria-hidden
                style={{ color: "var(--color-text-muted)", flexShrink: 0, width: "1.125rem", height: "1.125rem" }}
              />
            </div>
            <div className="onboarding-hub-asset-actions">
              <Link href="/app/linkedin" className="btn-outline btn-sm">
                Add LinkedIn
              </Link>
              <button type="button" className="btn-ghost btn-sm" disabled>
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
      <p className="onboarding-hub-footer-note">
        <span aria-hidden="true" className="onboarding-hub-footer-icon">✦</span>
        You can update your profile anytime from your dashboard.
      </p>
    </div>
  );
}
