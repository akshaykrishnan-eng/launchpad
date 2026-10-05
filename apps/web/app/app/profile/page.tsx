import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AddExperienceForm } from "@/features/profile/AddExperienceForm";
import {
  getServerCandidateProfile,
  getServerEducation,
  getServerExperience,
  getServerPreferences,
  getServerSkills,
} from "@/lib/candidate/backend";
import { getAccessToken } from "@/lib/auth/session";

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

  return (
    <main style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Your Profile</h1>
        <p style={{ opacity: 0.75 }}>{profile.completion_percentage}% complete</p>
      </div>

      <Section title="About you" editHref="/onboarding/about">
        {profile.first_name ? (
          <ul>
            <li>
              {profile.first_name} {profile.last_name}
            </li>
            <li>{profile.mobile_number}</li>
            <li>{profile.current_city}</li>
            <li>{profile.current_status}</li>
          </ul>
        ) : (
          <EmptyState />
        )}
      </Section>

      <Section title="Education" editHref="/onboarding/education">
        {education && education.length > 0 ? (
          <ul>
            {education.map((entry) => (
              <li key={entry.id}>
                {entry.degree} in {entry.specialization ?? "—"}, {entry.institution}
                {entry.graduation_year ? ` (${entry.graduation_year})` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState />
        )}
      </Section>

      <Section title="Skills" editHref="/onboarding/skills">
        {skills && skills.length > 0 ? (
          <p>{skills.map((skill) => skill.name).join(", ")}</p>
        ) : (
          <EmptyState />
        )}
      </Section>

      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Work experience</h2>
        {experience && experience.length > 0 ? (
          <ul>
            {experience.map((entry) => (
              <li key={entry.id}>
                {entry.job_title} at {entry.company}
                {entry.is_current ? " (current)" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ opacity: 0.6 }}>No work experience added yet.</p>
        )}
        <AddExperienceForm />
      </section>

      <Section title="Career interests" editHref="/onboarding/career">
        {preferences && (preferences.preferred_roles.length > 0 || preferences.preferred_locations.length > 0) ? (
          <ul>
            <li>Roles: {preferences.preferred_roles.join(", ") || "—"}</li>
            <li>Locations: {preferences.preferred_locations.join(", ") || "—"}</li>
          </ul>
        ) : (
          <EmptyState />
        )}
      </Section>

      <Section title="Career goal" editHref="/onboarding/goal">
        {profile.career_goal ? <p>{profile.career_goal}</p> : <EmptyState />}
      </Section>
    </main>
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
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{title}</h2>
        <Link href={editHref}>Edit</Link>
      </div>
      {children}
    </section>
  );
}

function EmptyState() {
  return <p style={{ opacity: 0.6 }}>Not completed yet.</p>;
}
