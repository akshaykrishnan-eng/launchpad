import { redirect } from "next/navigation";

import { ExperienceStep } from "@/features/onboarding/ExperienceStep";
import { getAccessToken } from "@/lib/auth/session";
import { getServerExperience } from "@/lib/candidate/backend";

export default async function ExperiencePage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const experience = await getServerExperience(accessToken);
  return <ExperienceStep experience={experience ?? []} />;
}
