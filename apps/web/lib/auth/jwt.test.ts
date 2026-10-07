import { describe, expect, it } from "vitest";

import { isAccessTokenExpired } from "@/lib/auth/jwt";

function makeToken(exp: number | undefined): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ sub: "user-1", type: "access", exp }));
  return `${header}.${payload}.fake-signature`;
}

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

describe("isAccessTokenExpired", () => {
  it("is false for a token whose exp is in the future", () => {
    const token = makeToken(Math.floor(Date.now() / 1000) + 600);
    expect(isAccessTokenExpired(token)).toBe(false);
  });

  it("is true for a token whose exp is in the past", () => {
    const token = makeToken(Math.floor(Date.now() / 1000) - 60);
    expect(isAccessTokenExpired(token)).toBe(true);
  });

  it("is true for a malformed token", () => {
    expect(isAccessTokenExpired("not-a-jwt")).toBe(true);
  });

  it("is true when the exp claim is missing", () => {
    expect(isAccessTokenExpired(makeToken(undefined))).toBe(true);
  });
});
