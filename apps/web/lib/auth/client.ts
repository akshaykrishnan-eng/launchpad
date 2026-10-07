export type AuthActionResult = { ok: true } | { ok: false; error: string };
export type LoginResult = { ok: true; redirectTo: string } | { ok: false; error: string };

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

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
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
