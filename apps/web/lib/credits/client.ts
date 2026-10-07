import type { CreditApiError, CreditBalance, CreditTransaction } from "@/lib/credits/types";
import type { Page } from "@/lib/pagination";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

// Same tiny query-string builder as lib/admin/client.ts, kept local
// rather than shared across the candidate/admin boundary.
function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// Pydantic prefixes a field_validator's raised ValueError message with
// "Value error, " in its 422 response -- strip that off (see
// lib/linkedin/client.ts for the original fix).
function cleanMessage(msg: string): string {
  return msg.replace(/^Value error,\s*/, "");
}

function errorMessage(body: CreditApiError): string {
  if (!body.detail) return "Something went wrong. Please try again.";
  if (typeof body.detail === "string") return cleanMessage(body.detail);
  return body.detail.map((e) => cleanMessage(e.msg)).join("; ");
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`/api/candidate${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status, error: errorMessage(body) };
  }
  return { ok: true, data: body as T };
}

export const getCredits = () => request<CreditBalance[]>("/credits");

export const getCreditTransactions = (params: { page?: number; page_size?: number } = {}) =>
  request<Page<CreditTransaction>>(`/credits/transactions${query(params)}`);
