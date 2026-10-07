import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BackLink } from "@/components/BackLink";
import { ProfileHeader, STATUS_LABELS } from "@/features/profile/ProfileHeader";
import { WorkExperienceSection } from "@/features/profile/WorkExperienceSection";
import {
  getServerCandidateProfile,
  getServerEducation,
  getServerExperience,
  getServerPreferences,
  getServerSkills,
} from "@/lib/candidate/backend";
import { getAccessToken } from "@/lib/auth/session";

type NextSection = { label: string; href: string };

export default async function CandidateProfilePage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const [profile, education, skills, experience, preferences] = await Promise.all([
    getServerCandidateProfile(accessToken),
    getServerEducation(accessToken),
    getServerSkills(accessToken),
    getServerExperience(accessToken),
    getServerPreferences(accessToken),
  ]);

  if (!profile) {
    redirect("/login");
  }

  // A presentational hint only -- which section to fill in next, derived
  // from the same data already rendered below. The backend's completion
  // percentage (profile.completion_percentage) remains the single source
  // of truth for the number itself; this never recomputes it.
  const hasPreferences = Boolean(
    preferences && (preferences.preferred_roles.length > 0 || preferences.preferred_locations.length > 0),
  );
  const nextSection: NextSection | null =
    !profile.first_name
      ? { label: "About you", href: "/onboarding/about" }
      : !education || education.length === 0
        ? { label: "Education", href: "/onboarding/education" }
        : !skills || skills.length === 0
          ? { label: "Skills", href: "/onboarding/skills" }
          : !hasPreferences
            ? { label: "Career interests", href: "/onboarding/career" }
            : !profile.career_goal
              ? { label: "Career goal", href: "/onboarding/goal" }
              : null;

  return (
    <div className="page page-wide">
      <BackLink href="/app">Back to Dashboard</BackLink>

      <ProfileHeader profile={profile} nextSection={nextSection} />

      <div className="profile-layout">
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <Section title="About you" editHref="/onboarding/about">
            {profile.first_name ? (
              <FactList
                items={[profile.mobile_number, profile.current_city, STATUS_LABELS[profile.current_status ?? ""]]}
              />
            ) : (
              <SectionEmptyState />
            )}
          </Section>

          <Section title="Career goal" editHref="/onboarding/goal">
            {profile.career_goal ? <p>{profile.career_goal}</p> : <SectionEmptyState />}
          </Section>

          <Section title="Career interests" editHref="/onboarding/career">
            {preferences && (preferences.preferred_roles.length > 0 || preferences.preferred_locations.length > 0) ? (
              <FactList
                items={[
                  `Roles: ${preferences.preferred_roles.join(", ") || "—"}`,
                  `Locations: ${preferences.preferred_locations.join(", ") || "—"}`,
                ]}
              />
            ) : (
              <SectionEmptyState />
            )}
          </Section>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <Section title="Education" editHref="/onboarding/education">
            {education && education.length > 0 ? (
              <FactList
                items={education.map(
                  (entry) =>
                    `${entry.degree} in ${entry.specialization ?? "—"}, ${entry.institution}` +
                    (entry.graduation_year ? ` (${entry.graduation_year})` : ""),
                )}
              />
            ) : (
              <SectionEmptyState />
            )}
          </Section>

          <Section title="Skills" editHref="/onboarding/skills">
            {skills && skills.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {skills.map((skill) => (
                  <span key={skill.id} className="badge badge-neutral">
                    {skill.name}
                  </span>
                ))}
              </div>
            ) : (
              <SectionEmptyState />
            )}
          </Section>

          <WorkExperienceSection experience={experience ?? []} />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  editHref,
  children,
}: {
  title: string;
  editHref: string;
  children: ReactNode;
}) {
  return (
    <section className="section-block">
      <div className="section-block-header">
        <h2 style={{ fontSize: "1rem" }}>{title}</h2>
        <Link href={editHref} className="btn-ghost btn-sm" style={{ display: "inline-flex" }}>
          Edit
        </Link>
      </div>
      {children}
    </section>
  );
}

function FactList({ items }: { items: (string | null | undefined)[] }) {
  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      {items.filter(Boolean).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function SectionEmptyState() {
  return <p style={{ color: "var(--color-text-secondary)" }}>Not completed yet.</p>;
}
