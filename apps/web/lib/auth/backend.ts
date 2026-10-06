import "server-only";

import { config } from "@/lib/config";
import type { ApiErrorBody, TokenResponse, UserPublic } from "@/lib/auth/types";

/** Calls FastAPI directly over the Docker network (internalApiUrl), never
 * through this app's own /api routes -- this IS the server side of the
 * proxy, not a client of it. */
async function callApi(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${config.internalApiUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

export type BackendResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string };

function errorMessage(body: ApiErrorBody): string {
  if (!body.detail) return "Request failed";
  if (typeof body.detail === "string") return body.detail;
  return body.detail.map((e) => e.msg).join("; ");
}

async function toResult<T>(response: Response): Promise<BackendResult<T>> {
  if (response.ok) {
    const data = response.status === 204 ? (undefined as T) : ((await response.json()) as T);
    return { ok: true, status: response.status, data };
  }
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  return { ok: false, status: response.status, error: errorMessage(body) };
}

export async function registerUser(
  email: string,
  password: string,
): Promise<BackendResult<UserPublic>> {
  const response = await callApi("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return toResult<UserPublic>(response);
}

export async function loginUser(
  email: string,
  password: string,
): Promise<BackendResult<TokenResponse>> {
  const response = await callApi("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return toResult<TokenResponse>(response);
}

export async function refreshTokens(
  refreshToken: string,
): Promise<BackendResult<TokenResponse>> {
  const response = await callApi("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return toResult<TokenResponse>(response);
}

export async function logoutUser(refreshToken: string): Promise<BackendResult<undefined>> {
  const response = await callApi("/api/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return toResult<undefined>(response);
}

export async function fetchCurrentUser(
  accessToken: string,
): Promise<BackendResult<UserPublic>> {
  const response = await callApi("/api/v1/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return toResult<UserPublic>(response);
}
