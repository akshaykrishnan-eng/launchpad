export const config = {
  // Browser-facing API base URL (e.g. http://localhost:8000).
  publicApiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  // Server-to-server API base URL used by the Next.js server itself
  // (e.g. the "api" Docker Compose service name, not "localhost").
  internalApiUrl:
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000",
} as const;
