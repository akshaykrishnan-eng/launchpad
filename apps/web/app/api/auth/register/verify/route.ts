import { NextResponse } from "next/server";

import { verifyEmailOtp } from "@/lib/auth/backend";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.registration_token || !body?.otp) {
    return NextResponse.json(
      { detail: "Registration token and code are required" },
      { status: 400 },
    );
  }

  const result = await verifyEmailOtp(body.registration_token, body.otp);
  if (!result.ok) {
    return NextResponse.json({ detail: result.error }, { status: result.status });
  }

  return new NextResponse(null, { status: 204 });
}
