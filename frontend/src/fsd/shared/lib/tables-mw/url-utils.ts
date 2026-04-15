/**
 * Utilities for parsing and converting Tables.mws.ru URLs
 */

export interface ParsedTableUrl {
  datasheetId: string;
  viewId: string;
  fieldKey: "name" | "id";
  apiUrl: string;
}

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

/**
 * Check if URL is a tables.mws.ru URL (either workbench or API format)
 */
export function isTablesMwUrl(url: string): boolean {
  return WORKBENCH_URL_REGEX.test(url) || API_URL_REGEX.test(url);
}

/**
 * Parse any tables.mws.ru URL and convert to API URL
 * Supports:
 * - Workbench: https://tables.mws.ru/workbench/{datasheetId}/{viewId}
 * - API: https://tables.mws.ru/fusion/v1/datasheets/{datasheetId}/records?viewId={viewId}
 */
export function parseTablesMwUrl(url: string): ParsedTableUrl | null {
  try {
    // Try workbench format first
    const workbenchMatch = WORKBENCH_URL_REGEX.exec(url);
    if (workbenchMatch) {
      const datasheetId = workbenchMatch[1];
      const viewId = workbenchMatch[2] || "viw0Lfw3STnJg"; // default view
      const fieldKey: "name" | "id" = "name";

      const apiUrl = `https://tables.mws.ru/fusion/v1/datasheets/${datasheetId}/records?viewId=${viewId}&fieldKey=${fieldKey}`;

      return {
        datasheetId,
        viewId,
        fieldKey,
        apiUrl,
      };
    }

    // Try API format
    const apiMatch = API_URL_REGEX.exec(url);
    if (apiMatch) {
      const urlObj = new URL(url);
      const datasheetId = apiMatch[1];
      const viewId = urlObj.searchParams.get("viewId") || "viw0Lfw3STnJg";
      const fieldKey =
        (urlObj.searchParams.get("fieldKey") as "name" | "id") || "name";

      // Normalize to consistent API URL
      const apiUrl = `https://tables.mws.ru/fusion/v1/datasheets/${datasheetId}/records?viewId=${viewId}&fieldKey=${fieldKey}`;

      return {
        datasheetId,
        viewId,
        fieldKey,
        apiUrl,
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
