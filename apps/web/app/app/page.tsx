import { redirect } from "next/navigation";

import { LogoutButton } from "@/features/auth/LogoutButton";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ProtectedAppPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700 }}>Ellow Launchpad</h1>
      <p>
        Authenticated as:
        <br />
        <strong>{user.email}</strong>
      </p>
      <p>
        Roles:
        <br />
        <strong>{user.roles.join(", ")}</strong>
      </p>
      <LogoutButton />
    </main>
  );
}
