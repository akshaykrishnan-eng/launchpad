import { NextResponse } from "next/server";

import { completeRegistration } from "@/lib/auth/backend";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.registration_token || !body?.password) {
    return NextResponse.json(
      { detail: "Registration token and password are required" },
      { status: 400 },
    );
  }

  const result = await completeRegistration(body.registration_token, body.password);
  if (!result.ok) {
    return NextResponse.json({ detail: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 201 });
}
