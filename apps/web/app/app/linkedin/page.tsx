import { redirect } from "next/navigation";

import { LinkedInCentre } from "@/features/linkedin/LinkedInCentre";
import { getAccessToken } from "@/lib/auth/session";

export default async function LinkedInCentrePage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: "640px", margin: "0 auto", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>LinkedIn Centre</h1>
      <LinkedInCentre />
    </main>
  );
}
