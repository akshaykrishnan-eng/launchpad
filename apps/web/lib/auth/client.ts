export type AuthActionResult = { ok: true } | { ok: false; error: string };
export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string }
  | { ok: false; error: string; emailNotVerified: true };
export type StartVerificationResult =
  | { ok: true; registrationToken: string }
  | { ok: false; error: string; alreadyRegistered?: true };

async function postJson(path: string, body?: unknown): Promise<AuthActionResult> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.ok) {
    return { ok: true };
  }

  const data = await response.json().catch(() => ({}));
  return { ok: false, error: data.detail ?? "Something went wrong. Please try again." };
}

export function registerAccount(email: string, password: string): Promise<AuthActionResult> {
  return postJson("/api/auth/register", { email, password });
}

export async function startEmailVerification(email: string): Promise<StartVerificationResult> {
  const response = await fetch("/api/auth/register/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 409) {
      return { ok: false, error: data.detail ?? "Email is already registered", alreadyRegistered: true };
    }
    return { ok: false, error: data.detail ?? "Something went wrong. Please try again." };
  }

  return { ok: true, registrationToken: data.registration_token };
}

export function resendEmailVerification(registrationToken: string): Promise<AuthActionResult> {
  return postJson("/api/auth/register/resend", { registration_token: registrationToken });
}

export function verifyEmailOtp(
  registrationToken: string,
  otp: string,
): Promise<AuthActionResult> {
  return postJson("/api/auth/register/verify", { registration_token: registrationToken, otp });
}

export function completeRegistration(
  registrationToken: string,
  password: string,
): Promise<AuthActionResult> {
  return postJson("/api/auth/register/complete", {
    registration_token: registrationToken,
    password,
  });
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Detect the email-not-verified 403 so the UI can route to verification.
    if (
      response.status === 403 &&
      typeof data.detail === "object" &&
      data.detail?.code === "email_not_verified"
    ) {
      return {
        ok: false,
        error: "Your email has not been verified. Please complete email verification to sign in.",
        emailNotVerified: true,
      };
    }
    return { ok: false, error: data.detail ?? "Something went wrong. Please try again." };
  }

  // The server is the sole source of the destination (derived from the
  // backend's own roles for this session) -- default to /app only if
  // it's somehow missing, never inferred from anything client-side.
  return { ok: true, redirectTo: typeof data.redirectTo === "string" ? data.redirectTo : "/app" };
}

export function logout(): Promise<AuthActionResult> {
  return postJson("/api/auth/logout");
}
