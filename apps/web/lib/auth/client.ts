export type AuthActionResult = { ok: true } | { ok: false; error: string };

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

export function login(email: string, password: string): Promise<AuthActionResult> {
  return postJson("/api/auth/login", { email, password });
}

export function logout(): Promise<AuthActionResult> {
  return postJson("/api/auth/logout");
}
