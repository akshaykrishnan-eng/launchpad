import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";

const { refreshTokens } = vi.hoisted(() => ({ refreshTokens: vi.fn() }));
vi.mock("@/lib/auth/backend", () => ({ refreshTokens }));

import { proxy } from "./proxy";

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function makeAccessToken(expSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ sub: "user-1", type: "access", exp: expSeconds }));
  return `${header}.${payload}.fake-signature`;
}

function makeRequest(cookieHeader: string): NextRequest {
  return new NextRequest(
    new Request("http://localhost:3000/admin", { headers: cookieHeader ? { cookie: cookieHeader } : {} }),
  );
}

// This is the actual security-irrelevant-but-UX-critical bug from the
// SUPER_ADMIN diagnosis: the access-token cookie being merely *present*
// was being treated as "still authenticated", so an expired-but-present
// token silently skipped the refresh branch instead of triggering it.
describe("proxy", () => {
  afterEach(() => {
    refreshTokens.mockReset();
  });

  it("does not refresh when the access token is still valid", async () => {
    const token = makeAccessToken(Math.floor(Date.now() / 1000) + 600);
    const request = makeRequest(`${ACCESS_TOKEN_COOKIE}=${token}`);

    const response = await proxy(request);

    expect(refreshTokens).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });

  it("refreshes when the access-token cookie is present but expired", async () => {
    const expiredToken = makeAccessToken(Math.floor(Date.now() / 1000) - 60);
    refreshTokens.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        token_type: "bearer",
        expires_in: 900,
      },
    });
    const request = makeRequest(
      `${ACCESS_TOKEN_COOKIE}=${expiredToken}; ${REFRESH_TOKEN_COOKIE}=valid-refresh-token`,
    );

    const response = await proxy(request);

    expect(refreshTokens).toHaveBeenCalledWith("valid-refresh-token");
    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe("new-access-token");
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe("new-refresh-token");
  });

  it("redirects to /login when the access token is expired and the refresh token is rejected", async () => {
    const expiredToken = makeAccessToken(Math.floor(Date.now() / 1000) - 60);
    refreshTokens.mockResolvedValue({ ok: false, status: 401, error: "Refresh token has been revoked" });
    const request = makeRequest(
      `${ACCESS_TOKEN_COOKIE}=${expiredToken}; ${REFRESH_TOKEN_COOKIE}=stale-refresh-token`,
    );

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects to /login when there is no access or refresh token at all", async () => {
    const request = makeRequest("");

    const response = await proxy(request);

    expect(refreshTokens).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });
});
