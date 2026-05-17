const DEFAULT_WIKI_BACKEND_URL = "http://localhost:8085";
const DEFAULT_DEV_WRITE_LOGIN = "uskO2BIAF6jREwNMJr95MSQ";
const DEFAULT_DEV_WRITE_PASSWORD = "123";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function normalizeBackendUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    const isLocalHost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol === "http:" && !isLocalHost) {
      parsed.protocol = "https:";
    }
    return trimTrailingSlash(parsed.toString());
  } catch {
    return trimTrailingSlash(withScheme);
  }
}

export function getWikiBackendBaseUrl(): string {
  const configuredUrl =
    process.env.WIKILIVE_BACKEND_URL ?? process.env.BACKEND_URL;

  if (configuredUrl && configuredUrl.trim().length > 0) {
    return normalizeBackendUrl(configuredUrl);
  }

  return DEFAULT_WIKI_BACKEND_URL;
}

export function getWikiWriteAuthHeader(): string | null {
  const login = process.env.WIKILIVE_WRITE_LOGIN?.trim();
  const password = process.env.WIKILIVE_WRITE_PASSWORD?.trim();

  if (login && password) {
    const token = Buffer.from(`${login}:${password}`).toString("base64");
    return `Basic ${token}`;
  }

  // Developer convenience: if backend is local and env vars are absent,
  // fall back to demo credentials from backend SecurityConfig.
  const backendBaseUrl = getWikiBackendBaseUrl();
  const isLocalBackend =
    backendBaseUrl === DEFAULT_WIKI_BACKEND_URL ||
    backendBaseUrl.startsWith("http://localhost:") ||
    backendBaseUrl.startsWith("http://127.0.0.1:");

  if (!isLocalBackend) {
    return null;
  }

  const token = Buffer.from(
    `${DEFAULT_DEV_WRITE_LOGIN}:${DEFAULT_DEV_WRITE_PASSWORD}`,
  ).toString("base64");
  return `Basic ${token}`;
}
