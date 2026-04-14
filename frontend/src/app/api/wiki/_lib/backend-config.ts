const DEFAULT_WIKI_BACKEND_URL = "http://localhost:8085";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getWikiBackendBaseUrl(): string {
  const configuredUrl =
    process.env.WIKILIVE_BACKEND_URL ?? process.env.BACKEND_URL;

  if (configuredUrl && configuredUrl.trim().length > 0) {
    return trimTrailingSlash(configuredUrl.trim());
  }

  return DEFAULT_WIKI_BACKEND_URL;
}

export function getWikiWriteAuthHeader(): string | null {
  const login = process.env.WIKILIVE_WRITE_LOGIN;
  const password = process.env.WIKILIVE_WRITE_PASSWORD;

  if (!login || !password) {
    return null;
  }

  const token = Buffer.from(`${login}:${password}`).toString("base64");
  return `Basic ${token}`;
}
