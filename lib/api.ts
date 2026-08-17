import type { CreateUrlBody, ShortUrlDto, UpdateUrlBody } from "@/lib/types";

type ErrorBody = {
  error?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & ErrorBody;

  if (!response.ok) {
    throw new ApiError(
      typeof data.error === "string" ? data.error : "Request failed",
      response.status
    );
  }

  return data;
}

export async function fetchUrls() {
  const response = await fetch("/api/urls");
  return parseJson<ShortUrlDto[]>(response);
}

export async function fetchUrl(id: string) {
  const response = await fetch(`/api/urls/${id}`);
  return parseJson<ShortUrlDto>(response);
}

export async function createUrl(input: CreateUrlBody) {
  const response = await fetch("/api/urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<ShortUrlDto>(response);
}

export async function updateUrl(id: string, input: UpdateUrlBody) {
  const response = await fetch(`/api/urls/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<ShortUrlDto>(response);
}

export async function deleteUrl(id: string) {
  const response = await fetch(`/api/urls/${id}`, { method: "DELETE" });
  return parseJson<{ ok: true }>(response);
}

export type InviteDto = {
  id: string;
  url: string;
  expiresAt: string;
  createdAt: string;
};

export async function fetchInvites() {
  const response = await fetch("/api/invites");
  return parseJson<InviteDto[]>(response);
}

export async function createInvite() {
  const response = await fetch("/api/invites", { method: "POST" });
  return parseJson<InviteDto>(response);
}

export async function revokeInvite(id: string) {
  const response = await fetch(`/api/invites/${id}`, { method: "DELETE" });
  return parseJson<{ ok: true }>(response);
}
