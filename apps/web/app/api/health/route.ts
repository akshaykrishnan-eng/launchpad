import { NextResponse } from "next/server";
import { config } from "@/lib/config";

/**
 * Server-side proxy to the FastAPI backend's /health endpoint.
 * Runs in the Next.js server/container, so it reaches the API over the
 * Docker Compose network (internalApiUrl) rather than via the browser.
 */
export async function GET() {
  try {
    const response = await fetch(`${config.internalApiUrl}/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ status: "error" }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "error" }, { status: 502 });
  }
}
