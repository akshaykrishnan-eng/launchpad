import Link from "next/link";

import { ProgressRing } from "@/components/ProgressRing";
import type { CandidateProfile } from "@/lib/candidate/types";

export const STATUS_LABELS: Record<string, string> = {
  STUDENT: "Student",
  RECENTLY_GRADUATED: "Recently graduated",
  LOOKING_FOR_FIRST_JOB: "Looking for first job",
  CURRENTLY_EMPLOYED: "Currently employed",
};

type ProfileHeaderProps = {
  profile: CandidateProfile;
  nextSection: { label: string; href: string } | null;
};

export function ProfileHeader({ profile, nextSection }: ProfileHeaderProps) {
  const fullName = profile.first_name ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : null;
  const initials = fullName
    ? fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "?";
  const headline = [profile.current_status ? STATUS_LABELS[profile.current_status] : null, profile.current_city]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-label="Profile overview" className="card">
      <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
        <span className="avatar" style={{ width: "4rem", height: "4rem", fontSize: "1.5rem" }} aria-hidden="true">
          {initials}
        </span>

        <div style={{ flex: 1, minWidth: "12rem" }}>
          <h1 style={{ fontSize: "1.375rem" }}>
            {fullName ?? "Complete your profile"}
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "0.125rem" }}>
            {headline || (fullName ? "Add your status and city to help recruiters place you." : "So recruiters know who you are.")}
          </p>
        </div>

        <ProgressRing percentage={profile.completion_percentage} label="Profile completion" size={64} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginTop: "1.25rem",
          paddingTop: "1rem",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <p style={{ fontWeight: 700 }}>{profile.completion_percentage}% complete</p>

        {nextSection ? (
          <Link href={nextSection.href} className="btn-primary">
            Complete {nextSection.label} →
          </Link>
        ) : (
          <span className="badge badge-success">All sections complete</span>
        )}
      </div>
    </section>
  );
}
