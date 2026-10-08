import { NextResponse } from "next/server";

import { resendEmailVerification } from "@/lib/auth/backend";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.registration_token) {
    return NextResponse.json({ detail: "Registration token is required" }, { status: 400 });
  }

  const result = await resendEmailVerification(body.registration_token);
  if (!result.ok) {
    return NextResponse.json({ detail: result.error }, { status: result.status });
  }

  return new NextResponse(null, { status: 204 });
}
