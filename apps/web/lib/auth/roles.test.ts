import { describe, expect, it } from "vitest";

import { isAdminUser, isCandidateUser, postLoginDestination } from "@/lib/auth/roles";

describe("isAdminUser", () => {
  it("is false for null/undefined", () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });

  it("is false for a plain CANDIDATE", () => {
    expect(isAdminUser({ roles: ["CANDIDATE"] })).toBe(false);
  });

  it("is true for ADMIN", () => {
    expect(isAdminUser({ roles: ["ADMIN"] })).toBe(true);
  });

  it("is true for SUPER_ADMIN", () => {
    expect(isAdminUser({ roles: ["SUPER_ADMIN"] })).toBe(true);
  });

  it("is true when ADMIN is combined with other roles", () => {
    expect(isAdminUser({ roles: ["CANDIDATE", "ADMIN"] })).toBe(true);
  });
});

describe("isCandidateUser", () => {
  it("is false for null/undefined", () => {
    expect(isCandidateUser(null)).toBe(false);
    expect(isCandidateUser(undefined)).toBe(false);
  });

  it("is true for a plain CANDIDATE", () => {
    expect(isCandidateUser({ roles: ["CANDIDATE"] })).toBe(true);
  });

  it("is false for ADMIN", () => {
    expect(isCandidateUser({ roles: ["ADMIN"] })).toBe(false);
  });

  it("is false for other non-admin roles like RECRUITER", () => {
    expect(isCandidateUser({ roles: ["RECRUITER"] })).toBe(false);
  });
});

describe("postLoginDestination", () => {
  it("sends SUPER_ADMIN to /admin", () => {
    expect(postLoginDestination(["SUPER_ADMIN"])).toBe("/admin");
  });

  it("sends ADMIN to /admin", () => {
    expect(postLoginDestination(["ADMIN"])).toBe("/admin");
  });

  it("sends CANDIDATE to /app", () => {
    expect(postLoginDestination(["CANDIDATE"])).toBe("/app");
  });

  it("sends a user with no roles to /app", () => {
    expect(postLoginDestination([])).toBe("/app");
  });
});
