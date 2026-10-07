import { afterEach, describe, expect, it, vi } from "vitest";

const { loginUser, fetchCurrentUser, setSessionCookies } = vi.hoisted(() => ({
  loginUser: vi.fn(),
  fetchCurrentUser: vi.fn(),
  setSessionCookies: vi.fn(),
}));
vi.mock("@/lib/auth/backend", () => ({ loginUser, fetchCurrentUser }));
vi.mock("@/lib/auth/session", () => ({ setSessionCookies }));

import { POST } from "./route";

const TOKENS = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  token_type: "bearer",
  expires_in: 900,
};

function request(body: unknown) {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  afterEach(() => {
    loginUser.mockReset();
    fetchCurrentUser.mockReset();
    setSessionCookies.mockReset();
  });

  it("redirects a SUPER_ADMIN to /admin", async () => {
    loginUser.mockResolvedValue({ ok: true, status: 200, data: TOKENS });
    fetchCurrentUser.mockResolvedValue({
      ok: true,
      status: 200,
      data: { id: "u1", email: "super@example.com", roles: ["SUPER_ADMIN"], is_active: true },
    });

    const response = await POST(request({ email: "super@example.com", password: "x" }));
    const body = await response.json();

    expect(setSessionCookies).toHaveBeenCalledWith(TOKENS);
    expect(body).toEqual({ ok: true, redirectTo: "/admin" });
  });

  it("redirects an ADMIN to /admin", async () => {
    loginUser.mockResolvedValue({ ok: true, status: 200, data: TOKENS });
    fetchCurrentUser.mockResolvedValue({
      ok: true,
      status: 200,
      data: { id: "u2", email: "admin@example.com", roles: ["ADMIN"], is_active: true },
    });

    const response = await POST(request({ email: "admin@example.com", password: "x" }));
    const body = await response.json();

    expect(body).toEqual({ ok: true, redirectTo: "/admin" });
  });

  it("redirects a CANDIDATE to /app", async () => {
    loginUser.mockResolvedValue({ ok: true, status: 200, data: TOKENS });
    fetchCurrentUser.mockResolvedValue({
      ok: true,
      status: 200,
      data: { id: "u3", email: "candidate@example.com", roles: ["CANDIDATE"], is_active: true },
    });

    const response = await POST(request({ email: "candidate@example.com", password: "x" }));
    const body = await response.json();

    expect(body).toEqual({ ok: true, redirectTo: "/app" });
  });

  it("falls back to /app if /auth/me cannot be reached right after login", async () => {
    loginUser.mockResolvedValue({ ok: true, status: 200, data: TOKENS });
    fetchCurrentUser.mockResolvedValue({ ok: false, status: 500, error: "boom" });

    const response = await POST(request({ email: "candidate@example.com", password: "x" }));
    const body = await response.json();

    expect(body).toEqual({ ok: true, redirectTo: "/app" });
  });

  it("does not set cookies or determine a destination on invalid credentials", async () => {
    loginUser.mockResolvedValue({ ok: false, status: 401, error: "Invalid email or password" });

    const response = await POST(request({ email: "x@example.com", password: "wrong" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ detail: "Invalid email or password" });
    expect(setSessionCookies).not.toHaveBeenCalled();
    expect(fetchCurrentUser).not.toHaveBeenCalled();
  });

  it("rejects a request missing email/password before calling the backend", async () => {
    const response = await POST(request({ email: "x@example.com" }));

    expect(response.status).toBe(400);
    expect(loginUser).not.toHaveBeenCalled();
  });
});
