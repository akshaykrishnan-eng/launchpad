import Link from "next/link";
import { redirect } from "next/navigation";

import { ONBOARDING_STEPS } from "@/features/onboarding/steps";
import { getServerCandidateCompletion } from "@/lib/candidate/backend";
import { getAccessToken } from "@/lib/auth/session";

export default async function OnboardingOverviewPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const completion = await getServerCandidateCompletion(accessToken);
  const percentage = completion?.completion_percentage ?? 0;
  const isComplete = percentage === 100;

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem",
        gap: "1.5rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
        {isComplete ? "Your Launchpad profile is complete." : "Set up your Launchpad profile"}
      </h1>

      <div style={{ width: "100%", maxWidth: "320px" }}>
        <div
          style={{
            height: "0.75rem",
            borderRadius: "999px",
            backgroundColor: "#e5e7eb",
            overflow: "hidden",
          }}
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
        <p style={{ marginTop: "0.5rem", fontWeight: 600 }}>{percentage}% complete</p>
      </div>

      {isComplete ? (
        <Link href="/app/profile">View your profile</Link>
      ) : (
        <Link href="/onboarding/about">Continue onboarding</Link>
      )}

      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {ONBOARDING_STEPS.map((step) => (
          <li key={step.path}>
            <Link href={step.path}>{step.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
