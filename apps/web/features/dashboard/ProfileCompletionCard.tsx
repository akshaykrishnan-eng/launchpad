import Link from "next/link";

type ProfileCompletionCardProps = {
  percentage: number;
  actionRoute: string;
};

export function ProfileCompletionCard({ percentage, actionRoute }: ProfileCompletionCardProps) {
  return (
    <section
      aria-labelledby="profile-completion-heading"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <h2 id="profile-completion-heading" style={{ fontSize: "1.125rem", fontWeight: 600 }}>
        Profile Completion
      </h2>

      <p style={{ fontSize: "2rem", fontWeight: 700 }}>{percentage}%</p>

      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completion"
        style={{ height: "0.75rem", borderRadius: "999px", backgroundColor: "#e5e7eb", overflow: "hidden" }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: "#10b981",
            transition: "width 0.3s",
          }}
        />
      </div>

      {percentage < 100 && <Link href={actionRoute}>Complete Profile →</Link>}
    </section>
  );
}
