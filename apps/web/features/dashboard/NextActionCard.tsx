import Link from "next/link";

import type { NextAction } from "@/lib/candidate/types";

type NextActionCardProps = {
  action: NextAction;
};

export function NextActionCard({ action }: NextActionCardProps) {
  const isComplete = action.type === "PROFILE_COMPLETE";

  return (
    <section
      aria-labelledby="next-action-heading"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        padding: "1.5rem",
        backgroundColor: isComplete ? "#ecfdf5" : undefined,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <h2 id="next-action-heading" style={{ fontSize: "0.875rem", opacity: 0.75, textTransform: "uppercase" }}>
        {isComplete ? "All done" : "Next step"}
      </h2>
      <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{action.title}</p>
      <p style={{ opacity: 0.75 }}>{action.description}</p>
      {!isComplete && (
        <Link href={action.route} style={{ fontWeight: 600 }}>
          Go now →
        </Link>
      )}
    </section>
  );
}
