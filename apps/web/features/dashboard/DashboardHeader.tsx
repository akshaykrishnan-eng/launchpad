import Link from "next/link";

import { LogoutButton } from "@/features/auth/LogoutButton";

type DashboardHeaderProps = {
  firstName: string | null;
};

export function DashboardHeader({ firstName }: DashboardHeaderProps) {
  const greetingName = firstName ?? "there";

  return (
    <header
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "1rem",
        padding: "1.5rem",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Hi {greetingName} 👋</h1>
        <p style={{ opacity: 0.75 }}>Let&apos;s get you ready for your next career opportunity.</p>
      </div>

      <nav aria-label="Dashboard navigation" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
        <Link href="/app/profile">My profile</Link>
        <Link href="/app/resume">Resume Centre</Link>
        <Link href="/app/linkedin">LinkedIn Centre</Link>
        <LogoutButton />
      </nav>
    </header>
  );
}
