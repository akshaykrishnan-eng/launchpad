import { NextResponse } from "next/server";

import { registerUser } from "@/lib/auth/backend";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ detail: "Email and password are required" }, { status: 400 });
  }

  const result = await registerUser(body.email, body.password);
  if (!result.ok) {
    return NextResponse.json({ detail: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 201 });
}
