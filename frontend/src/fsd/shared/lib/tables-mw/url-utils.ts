/**
 * Utilities for parsing and converting Tables.mws.ru URLs
 */

export interface ParsedTableUrl {
  datasheetId: string;
  viewId: string;
  fieldKey: "name" | "id";
  apiUrl: string;
  browserUrl: string;
}

const DEFAULT_VIEW_ID = "viw0Lfw3STnJg";

/**
 * Workbench URL regex: https://tables.mws.ru/workbench/{datasheetId}/{viewId}
 */
const WORKBENCH_URL_REGEX =
  /^https:\/\/tables\.mws\.ru\/workbench\/([^\/]+)(?:\/([^\/\?]+))?/;

/**
 * API URL regex: https://tables.mws.ru/fusion/v1/datasheets/{datasheetId}/records
 */
const API_URL_REGEX =
  /^https:\/\/tables\.mws\.ru\/fusion\/v1\/datasheets\/([^\/]+)\/records/;
const PROXY_API_PATH_REGEX = /^\/fusion\/v1\/datasheets\/([^\/]+)\/records$/i;

export function buildTablesMwApiUrl(params: {
  datasheetId: string;
  viewId?: string;
  fieldKey?: "name" | "id";
}): string {
  const { datasheetId, viewId, fieldKey } = params;
  const url = new URL(
    `https://tables.mws.ru/fusion/v1/datasheets/${datasheetId}/records`,
  );
  url.searchParams.set("viewId", viewId || DEFAULT_VIEW_ID);
  url.searchParams.set("fieldKey", fieldKey || "name");
  return url.toString();
}

export function buildTablesMwBrowserUrl(params: {
  datasheetId: string;
  viewId?: string;
}): string {
  const { datasheetId, viewId } = params;
  if (!viewId) {
    return `https://tables.mws.ru/workbench/${datasheetId}`;
  }
  const url = new URL(`https://tables.mws.ru/workbench/${datasheetId}/${viewId}`);
  url.searchParams.set("comment", "1");
  return url.toString();
}

/**
 * Check if URL is a tables.mws.ru URL (either workbench or API format)
 */
export function isTablesMwUrl(url: string): boolean {
  return WORKBENCH_URL_REGEX.test(url) || API_URL_REGEX.test(url);
}

/**
 * Parse any tables.mws.ru URL and convert to both API and browser forms.
 * Supports:
 * - Workbench: https://tables.mws.ru/workbench/{datasheetId}/{viewId}
 * - API: https://tables.mws.ru/fusion/v1/datasheets/{datasheetId}/records?viewId={viewId}
 */
export function parseTablesMwUrl(url: string): ParsedTableUrl | null {
  try {
    const proxyUrlObj = new URL(url, "https://dummy.local");
    if (proxyUrlObj.pathname === "/api/tables-mw") {
      const path = proxyUrlObj.searchParams.get("path") || "";
      const proxyMatch = PROXY_API_PATH_REGEX.exec(path);
      if (proxyMatch) {
        const datasheetId = proxyMatch[1];
        const viewId =
          proxyUrlObj.searchParams.get("viewId") || DEFAULT_VIEW_ID;
        const fieldKey =
          (proxyUrlObj.searchParams.get("fieldKey") as "name" | "id") || "name";
        return {
          datasheetId,
          viewId,
          fieldKey,
          apiUrl: buildTablesMwApiUrl({ datasheetId, viewId, fieldKey }),
          browserUrl: buildTablesMwBrowserUrl({ datasheetId, viewId }),
        };
      }
    }

    const workbenchMatch = WORKBENCH_URL_REGEX.exec(url);
    if (workbenchMatch) {
      const datasheetId = workbenchMatch[1];
      const urlObj = new URL(url);
      const viewId = workbenchMatch[2] || urlObj.searchParams.get("viewId") || DEFAULT_VIEW_ID;
      const fieldKey = "name" as const;
      return {
        datasheetId,
        viewId,
        fieldKey,
        apiUrl: buildTablesMwApiUrl({ datasheetId, viewId, fieldKey }),
        browserUrl: buildTablesMwBrowserUrl({ datasheetId, viewId }),
      };
    }

    const apiMatch = API_URL_REGEX.exec(url);
    if (apiMatch) {
      const urlObj = new URL(url);
      const datasheetId = apiMatch[1];
      const viewId = urlObj.searchParams.get("viewId") || DEFAULT_VIEW_ID;
      const fieldKey =
        (urlObj.searchParams.get("fieldKey") as "name" | "id") || "name";
      return {
        datasheetId,
        viewId,
        fieldKey,
        apiUrl: buildTablesMwApiUrl({ datasheetId, viewId, fieldKey }),
        browserUrl: buildTablesMwBrowserUrl({ datasheetId, viewId }),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Convert any tables.mws.ru URL to API URL format
 * Returns original URL if it's not a valid tables.mws.ru URL
 */
export function toApiUrl(url: string): string {
  const parsed = parseTablesMwUrl(url);
  return parsed?.apiUrl || url;
}

/**
 * Convert any tables.mws.ru URL to browser URL format
 * Returns original URL if it's not a valid tables.mws.ru URL
 */
export function toBrowserUrl(url: string): string {
  const parsed = parseTablesMwUrl(url);
  return parsed?.browserUrl || url;
}

/**
 * Extract datasheet ID from any tables.mws.ru URL
 */
export function extractDatasheetId(url: string): string | null {
  const parsed = parseTablesMwUrl(url);
  return parsed?.datasheetId || null;
}

/**
 * Extract view ID from any tables.mws.ru URL
 */
export function extractViewId(url: string): string | null {
  const parsed = parseTablesMwUrl(url);
  return parsed?.viewId || null;
}
