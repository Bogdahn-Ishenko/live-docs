import type {
  PageEditor,
  UpsertWikiPagePayload,
  WikiPage,
  WikiPageDraft,
  WikiPageGraph,
  WikiPageVersion,
} from "./types";

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

export async function fetchWikiPagesGraph(): Promise<WikiPageGraph> {
  const response = await fetch("/api/wiki/pages/graph", {
    method: "GET",
    cache: "no-store",
  });

  return parseApiResponse<WikiPageGraph>(response);
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

export async function deleteWikiPage(slug: string): Promise<void> {
  const response = await fetch(`/api/wiki/pages/${encodeSlugPath(slug)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Ошибка запроса (статус ${response.status})`;
    throw new Error(message);
  }
}

export async function fetchPageVersions(
  slug: string,
): Promise<WikiPageVersion[]> {
  const response = await fetch(
    `/api/wiki/pages/${encodeSlugPath(slug)}/versions`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return parseApiResponse<WikiPageVersion[]>(response);
}

export async function fetchPageAllVersions(
  slug: string,
): Promise<WikiPageVersion[]> {
  const response = await fetch(
    `/api/wiki/pages/${encodeSlugPath(slug)}/versions/all`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return parseApiResponse<WikiPageVersion[]>(response);
}

export async function fetchPageVersion(
  slug: string,
  versionId: number | string,
): Promise<WikiPageVersion> {
  const response = await fetch(
    `/api/wiki/pages/${encodeSlugPath(slug)}/versions/${encodeURIComponent(String(versionId))}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return parseApiResponse<WikiPageVersion>(response);
}

export async function restorePageVersion(
  slug: string,
  versionId: number | string,
  comment?: string,
): Promise<WikiPage> {
  const query = comment ? `?comment=${encodeURIComponent(comment)}` : "";
  const response = await fetch(
    `/api/wiki/pages/${encodeSlugPath(slug)}/versions/${encodeURIComponent(String(versionId))}/restore${query}`,
    {
      method: "POST",
      cache: "no-store",
    },
  );

  return parseApiResponse<WikiPage>(response);
}

export async function fetchPageDraft(
  slug: string,
): Promise<WikiPageDraft | null> {
  const response = await fetch(
    `/api/wiki/pages/${encodeSlugPath(slug)}/draft`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  return parseApiResponse<WikiPageDraft>(response);
}

export async function savePageDraft(
  slug: string,
  payload: { title: string; description?: string | null; content: string },
): Promise<WikiPageDraft> {
  const response = await fetch(
    `/api/wiki/pages/${encodeSlugPath(slug)}/draft`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return parseApiResponse<WikiPageDraft>(response);
}

export async function deletePageDraft(slug: string): Promise<void> {
  const response = await fetch(
    `/api/wiki/pages/${encodeSlugPath(slug)}/draft`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Ошибка запроса (статус ${response.status})`;
    throw new Error(message);
  }
}

export async function publishPageDraft(
  slug: string,
  comment?: string,
): Promise<WikiPage> {
  const query = comment ? `?comment=${encodeURIComponent(comment)}` : "";
  const response = await fetch(
    `/api/wiki/pages/${encodeSlugPath(slug)}/draft/publish${query}`,
    {
      method: "POST",
      cache: "no-store",
    },
  );

  return parseApiResponse<WikiPage>(response);
}

export async function fetchPageEditors(slug: string): Promise<PageEditor[]> {
  const response = await fetch(
    `/api/wiki/pages/${encodeSlugPath(slug)}/editors`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const data = await parseApiResponse<PageEditor[] | string[]>(response);
  return data.map((item) =>
    typeof item === "string" ? { username: item } : item,
  );
}

export async function addPageEditor(
  slug: string,
  username: string,
): Promise<PageEditor> {
  const response = await fetch(
    `/api/wiki/pages/${encodeSlugPath(slug)}/editors`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    },
  );

  const data = await parseApiResponse<PageEditor | string>(response);
  return typeof data === "string" ? { username: data } : data;
}

export async function removePageEditor(
  slug: string,
  username: string,
): Promise<void> {
  const response = await fetch(
    `/api/wiki/pages/${encodeSlugPath(slug)}/editors/${encodeURIComponent(username)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Ошибка запроса (статус ${response.status})`;
    throw new Error(message);
  }
}
