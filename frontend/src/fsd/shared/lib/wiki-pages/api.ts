import type { UpsertWikiPagePayload, WikiPage } from "./types";

function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function encodeSlugPath(slug: string): string {
  return encodeURIComponent(normalizeSlug(slug));
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      payload.error
        ? payload.error
        : `Ошибка запроса (статус ${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchWikiPages(): Promise<WikiPage[]> {
  const response = await fetch("/api/wiki/pages", {
    method: "GET",
    cache: "no-store",
  });

  return parseApiResponse<WikiPage[]>(response);
}

export async function fetchWikiPage(slug: string): Promise<WikiPage> {
  const response = await fetch(`/api/wiki/pages/${encodeSlugPath(slug)}`, {
    method: "GET",
    cache: "no-store",
  });

  return parseApiResponse<WikiPage>(response);
}

export async function createWikiPage(
  payload: UpsertWikiPagePayload,
): Promise<WikiPage> {
  const response = await fetch("/api/wiki/pages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<WikiPage>(response);
}

export async function updateWikiPage(
  slug: string,
  payload: UpsertWikiPagePayload,
): Promise<WikiPage> {
  const response = await fetch(`/api/wiki/pages/${encodeSlugPath(slug)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<WikiPage>(response);
}
