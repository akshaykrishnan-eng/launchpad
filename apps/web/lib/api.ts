export type HealthResponse = {
  status: string;
};

/**
 * Checks backend health via this app's own `/api/health` route, which
 * proxies to the FastAPI service server-side. Called from the browser,
 * so it never needs to know the API's internal Docker network address.
 */
export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
