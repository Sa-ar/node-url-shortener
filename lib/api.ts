import type { CreateUrlBody, ShortUrlDto } from "@/lib/types";

type ErrorBody = {
  error?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & ErrorBody;

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Request failed"
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

export async function deleteUrl(id: string) {
  const response = await fetch(`/api/urls/${id}`, { method: "DELETE" });
  return parseJson<{ ok: true }>(response);
}
