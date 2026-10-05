import { redirect } from "next/navigation";

import { ResumeCentre } from "@/features/resume/ResumeCentre";
import { getAccessToken } from "@/lib/auth/session";

export default async function ResumeCentrePage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: "640px", margin: "0 auto", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>Resume Centre</h1>
      <ResumeCentre />
    </main>
  );
}
