import { NextResponse } from "next/server";

import { startEmailVerification } from "@/lib/auth/backend";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json({ detail: "Email is required" }, { status: 400 });
  }

  const result = await startEmailVerification(body.email);
  if (!result.ok) {
    return NextResponse.json({ detail: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
