import "server-only";

import { config } from "@/lib/config";
import type { Event } from "@/lib/events/types";

/** Direct server-side call to FastAPI, for Server Components -- same
 * pattern as lib/linkedin/backend.ts. */
async function callApi<T>(path: string, accessToken: string): Promise<T | null> {
  const response = await fetch(`${config.internalApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export function getServerEvents(accessToken: string) {
  return callApi<Event[]>("/api/v1/candidate/events", accessToken);
}
