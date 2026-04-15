import { useCallback, useEffect, useMemo, useState } from "react";

import { importFile } from "@lexical/file";
import { $generateHtmlFromNodes } from "@lexical/html";
import { $convertToMarkdownString } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { DownloadIcon, FileTextIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/fsd/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/fsd/shared/ui/dropdown-menu";
import { MARKDOWN_TRANSFORMERS } from "@/fsd/shared/ui/editor/transformers/markdown-transformers";
import { parseTablesMwUrl } from "@/fsd/shared/lib/tables-mw/url-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/fsd/shared/ui/tooltip";

type ExportFormat = "markdown" | "pdf" | "docx";
type ExportTarget = "pdf" | "docx";
const TABLES_EXPORT_MAX_ROWS = 300;
const MARKDOWN_TABLE_MAX_ROWS = 10;
const MARKDOWN_TABLE_MAX_COLUMNS = 4;
const MARKDOWN_TABLE_MAX_CELL_LENGTH = 40;
const PRETTY_TABLE_MAX_ROWS = 250;
const PRETTY_TABLE_MAX_COLUMNS = 18;
const PRETTY_TABLE_MAX_CELLS = 3600;
const PRETTY_TABLE_MAX_CELL_LENGTH = 500;
const PRETTY_TABLE_MAX_LONG_CELLS = 180;
const TABLE_COLUMNS_LANDSCAPE_START = 6;
const TABLE_COLUMNS_SPLIT_START = 9;
const DOCX_MAX_COLUMNS_PER_CHUNK = 7;
const DOCX_MAX_TABLE_PARTS = 3;
const SOFT_BREAK_EVERY = 12;

function safeBaseFileName(title: string | undefined): string {
  const normalized = (title || "Document")
    .trim()
    .replaceAll(/[\\/:*?"<>|]/g, "-")
    .replaceAll(/\s+/g, " ")
    .replaceAll(/^\.+|\.+$/g, "");
  return normalized.length > 0 ? normalized : "Document";
}

function saveBlob(blob: Blob, fileName: string) {
  const nav = window.navigator as Navigator & {
    msSaveOrOpenBlob?: (b: Blob, n?: string) => boolean;
  };

  if (nav.msSaveOrOpenBlob) {
    nav.msSaveOrOpenBlob(blob, fileName);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);

  requestAnimationFrame(() => a.click());

  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 30000);
}

const fetchWithTimeout = async (
  input: RequestInfo,
  init: RequestInit = {},
  ms = 60000,
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

function parseFileNameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;

  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]).replace(/["']/g, "");
    } catch {
      return utf8[1].replace(/["']/g, "");
    }
  }

  const fallback = disposition.match(/filename="?([^";]+)"?/i);
  return fallback?.[1] ?? null;
}

async function readResponseError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; details?: string }
    | null;

  if (payload?.error) {
    return payload.error;
  }
  if (payload?.details) {
    return payload.details;
  }
  return `Export failed (status ${response.status})`;
}

type TablesRecord = {
  fields?: Record<string, unknown>;
};

type TablesApiSuccess<T> = {
  success: boolean;
  data?: T;
};
const TABLES_MW_URL_REGEXP =
  /^https:\/\/tables\.mws\.ru\/(?:workbench\/\S+|fusion\/v1\/datasheets\/\S+)\s*$/;

function replaceBase64ImagesInMarkdown(markdown: string): string {
  return markdown.replace(
    /!\[([^\]]*)\]\((data:image\/[^)]+)\)/gi,
    (_match, alt) =>
      `> [Embedded image${alt ? `: ${alt}` : ""} is not exported to Markdown]`,
  );
}

function insertVisibleBreaksForMarkdown(value: string, chunk = 8): string {
  return value.replace(/[^\s\-_/.,;:()[\]{}]{20,}/g, (token) =>
    token.replace(new RegExp(`(.{${chunk}})`, "g"), "$1 ").trimEnd(),
  );
}

function applySoftBreaksToMarkdown(markdown: string): string {
  const lines = markdown.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    if (inCodeBlock || line.trim().startsWith("|") || /https?:\/\/\S+/i.test(line)) {
      result.push(line);
      continue;
    }

    result.push(insertVisibleBreaksForMarkdown(line));
  }

  return result.join("\n");
}

function stringifyTableCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyTableCellValue(item))
      .filter((item) => item.length > 0)
      .join(", ");
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const preferred =
      obj.name ??
      obj.title ??
      obj.text ??
      obj.url ??
      obj.email ??
      obj.id;
    if (preferred !== undefined) {
      return stringifyTableCellValue(preferred);
    }
    return JSON.stringify(obj);
  }
  return "";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function extractTablesMwUrlFromMarkdownLine(line: string): string | null {
  const trimmed = line.trim();
  const placeholderMatch = trimmed.match(
    /^\[\[TABLES_MW:(https:\/\/tables\.mws\.ru\/.+)\]\]$/i,
  );
  if (placeholderMatch) {
    return placeholderMatch[1];
  }

  if (TABLES_MW_URL_REGEXP.test(trimmed)) {
    return trimmed;
  }

  const angleMatch = trimmed.match(
    /^<\s*(https:\/\/tables\.mws\.ru\/[^>]+)\s*>$/i,
  );
  if (angleMatch) {
    return angleMatch[1];
  }

  const markdownLinkMatch = trimmed.match(
    /^\[[^\]]*]\((https:\/\/tables\.mws\.ru\/[^)\s]+)\)$/i,
  );
  if (markdownLinkMatch) {
    return markdownLinkMatch[1];
  }

  return null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function buildLayoutInlineMarkdown(columns: string[]): string {
  const cleaned = columns
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value.length > 0);

  if (cleaned.length === 0) {
    return "";
  }

  return `**Columns:** ${cleaned.join(" | ")}`;
}

function enrichMarkdownWithCustomBlocks(rawMarkdown: string, html: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(
    `<div data-export-root="true">${html}</div>`,
    "text/html",
  );
  const root = document.querySelector("[data-export-root='true']");
  if (!root) {
    return rawMarkdown;
  }

  const extraSections: string[] = [];

  const layoutContainers = Array.from(
    root.querySelectorAll<HTMLElement>("[data-lexical-layout-container='true']"),
  );
  for (const container of layoutContainers) {
    const columns = Array.from(container.children)
      .map((child) => normalizeWhitespace((child as HTMLElement).innerText || ""))
      .filter((text) => text.length > 0);
    if (columns.length === 0) continue;

    const inlineLayout = buildLayoutInlineMarkdown(columns);
    if (inlineLayout.length > 0) {
      extraSections.push(inlineLayout);
    }
  }

  const tables = Array.from(
    root.querySelectorAll<HTMLElement>("[data-lexical-tables-mw='true']"),
  );
  for (const table of tables) {
    const url =
      table.getAttribute("data-url") ||
      table.querySelector("a")?.getAttribute("href") ||
      table.textContent?.trim();
    if (!url) continue;
    extraSections.push(`[[TABLES_MW:${url}]]`);
  }

  if (extraSections.length === 0) {
    return rawMarkdown;
  }

  let normalized = rawMarkdown;
  const rawLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const hasLayoutContent = rawLines.some((line) => line.includes("|") || /^\*\*Колонки:\*\*/i.test(line) || /^\*\*Columns:\*\*/i.test(line));
  normalized = normalized.replace(/^\s*##\s+Columns\s*$/gim, "").trimEnd();
  normalized = normalized.replace(/^\s*##\s+Columns\s*$/gim, "").trimEnd();

  const missingSections = extraSections.filter((section) => {
    if (section.startsWith("[[TABLES_MW:")) {
      return !normalized.includes(section);
    }
    if (section.startsWith("**Колонки:**")) {
      return !hasLayoutContent;
    }
    return true;
  });

  if (missingSections.length === 0) {
    return normalized;
  }

  return [normalized, ...missingSections]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");
}

function escapeMarkdownCell(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replaceAll("\r\n", " ")
    .replaceAll("\n", " ")
    .replace(/\s+/g, " ")
    .replaceAll("|", "\\|")
    .trim();
}

function normalizeMarkdownTableCell(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replaceAll("\r\n", " ")
    .replaceAll("\n", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateMarkdownCell(value: string, max = MARKDOWN_TABLE_MAX_CELL_LENGTH): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function insertZeroWidthBreaks(value: string, every = SOFT_BREAK_EVERY): string {
  return value.replace(new RegExp(`([^\\s-]{${every}})`, "g"), "$1\u200B");
}

function insertHardBreaksForPdf(value: string, every = 6): string {
  return value.replace(/[^\s]{16,}/g, (token) =>
    token.replace(new RegExp(`(.{${every}})`, "g"), "$1 ").trimEnd(),
  );
}

function normalizeTableCellValue(value: string, isPdf = false): string {
  const compact = value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
  const truncated = compact.length > 700 ? `${compact.slice(0, 699)}...` : compact;
  if (isPdf) return insertHardBreaksForPdf(truncated, 6);
  return insertZeroWidthBreaks(truncated, 8);
}

async function loadTablesData(url: string): Promise<{
  headers: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
  browserUrl: string;
} | null> {
  const parsed = parseTablesMwUrl(url);
  if (!parsed) return null;

  const recordsQuery = new URLSearchParams({
    path: `/fusion/v1/datasheets/${parsed.datasheetId}/records`,
    viewId: parsed.viewId,
    fieldKey: "name",
    pageSize: String(TABLES_EXPORT_MAX_ROWS + 1),
  });
  const recordsResponse = await fetch(`/api/tables-mw?${recordsQuery.toString()}`);
  if (!recordsResponse.ok) return null;

  const recordsPayload = (await recordsResponse.json()) as TablesApiSuccess<{
    records?: TablesRecord[];
  }>;
  const rawRecords = Array.isArray(recordsPayload?.data?.records)
    ? recordsPayload.data.records
    : [];
  const truncated = rawRecords.length > TABLES_EXPORT_MAX_ROWS;
  const rows = rawRecords
    .slice(0, TABLES_EXPORT_MAX_ROWS)
    .map((record) =>
      record?.fields && typeof record.fields === "object"
        ? record.fields
        : {},
    );

  const fieldsQuery = new URLSearchParams({
    path: `/fusion/v1/datasheets/${parsed.datasheetId}/fields`,
    viewId: parsed.viewId,
  });
  const fieldsResponse = await fetch(`/api/tables-mw?${fieldsQuery.toString()}`);
  const fieldsPayload = fieldsResponse.ok
    ? ((await fieldsResponse.json()) as TablesApiSuccess<{
      fields?: Array<{ name?: string }>;
    }>)
    : null;

  const headersFromApi = (fieldsPayload?.data?.fields || [])
    .map((field) => (typeof field.name === "string" ? field.name.trim() : ""))
    .filter((name) => name.length > 0);

  const headersFromRows = Array.from(
    new Set(
      rows.flatMap((row) => Object.keys(row)),
    ),
  );

  const headers =
    headersFromApi.length > 0
      ? [
        ...headersFromApi,
        ...headersFromRows.filter((header) => !headersFromApi.includes(header)),
      ]
      : headersFromRows.length > 0
        ? headersFromRows
        : ["Value"];

  return { headers, rows, truncated, browserUrl: parsed.browserUrl };
}

function buildExportTableHtml(
  headers: string[],
  rows: Record<string, unknown>[],
  truncated: boolean,
  compact = false,
): string {
  const safeColumns = Math.max(1, headers.length);
  const columnWidth = Math.floor(10000 / safeColumns) / 100;
  const colGroup = `<colgroup>${headers
    .map(() => `<col style="width:${columnWidth}%;" />`)
    .join("")}</colgroup>`;
  const tableStyle =
    `border-collapse:collapse;width:100%;margin:8px 0;table-layout:fixed;border:1px solid #d1d5db;font-size:${compact ? "9px" : "11px"};`;
  const thStyle =
    `border:1px solid #d1d5db;padding:${compact ? "3px 4px" : "5px 6px"};background:#f3f4f6;font-weight:600;font-size:${compact ? "9px" : "11px"};text-align:left;vertical-align:top;word-break:break-all;overflow-wrap:anywhere;`;
  const tdStyle =
    `border:1px solid #e5e7eb;padding:${compact ? "3px 4px" : "5px 6px"};font-size:${compact ? "9px" : "11px"};vertical-align:top;word-break:break-all;overflow-wrap:anywhere;white-space:normal;line-height:1.4;`;

  const thead = `<thead><tr>${headers
    .map((header) => `<th style="${thStyle}">${escapeHtml(header)}</th>`)
    .join("")}</tr></thead>`;
  const tbodyRows = rows
    .map(
      (row) =>
        `<tr>${headers
          .map(
            (header) => {
              const raw = stringifyTableCellValue(row[header]);
              const short =
                raw.length > PRETTY_TABLE_MAX_CELL_LENGTH
                  ? `${raw.slice(0, PRETTY_TABLE_MAX_CELL_LENGTH - 1)}...`
                  : raw;
              const title = raw.length > short.length ? ` title="${escapeHtml(raw)}"` : "";
              return `<td style="${tdStyle}"${title}>${escapeHtml(short)}</td>`;
            },
          )
          .join("")}</tr>`,
    )
    .join("");

  const truncatedRow = truncated
    ? `<tr><td style="${tdStyle};font-style:italic;background:#f9fafb;" colspan="${headers.length}">Таблица была обрезана. См. исходную ссылку.</td></tr>`
    : "";

  return `<table style="${tableStyle}">${colGroup}${thead}<tbody>${tbodyRows}${truncatedRow}</tbody></table>`;
}

function buildExportTableHtmlDocx(
  headers: string[],
  rows: Record<string, unknown>[],
  truncated: boolean,
  isPdf = false,
): string {
  const colPct = (100 / Math.max(1, headers.length)).toFixed(2);
  const colGroup = `<colgroup>${headers
    .map(() => `<col style="width:${colPct}%">`)
    .join("")}</colgroup>`;
  const cellStyle =
    "border:1px solid #d1d5db;padding:4px;vertical-align:top;white-space:normal;word-break:break-all;overflow-wrap:anywhere;font-size:10px;line-height:1.25;";

  const thead = `<thead><tr>${headers
    .map(
      (header) =>
        `<th style="${cellStyle};font-weight:600;background:#f3f4f6;">${escapeHtml(normalizeTableCellValue(header, isPdf))}</th>`,
    )
    .join("")}</tr></thead>`;
  const tbody = rows
    .map((row) => {
      const tds = headers
        .map((header) => {
          const raw = stringifyTableCellValue(row[header]);
          const normalized = normalizeTableCellValue(raw, isPdf);
          const content = `<div style="display:block;width:100%;max-width:100%;min-width:0;word-break:break-all;word-wrap:break-word;overflow-wrap:anywhere;white-space:${isPdf ? "pre-wrap" : "normal"};overflow:hidden;">${escapeHtml(normalized)}</div>`;
          return `<td style="${cellStyle};max-width:0;min-width:0;">${content}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  const truncatedRow = truncated
    ? `<tr><td style="${cellStyle}" colspan="${headers.length}">Table was truncated. See source link.</td></tr>`
    : "";
  return `<table data-export-table="docx" style="width:100%;border-collapse:collapse;table-layout:fixed;">${colGroup}${thead}<tbody>${tbody}${truncatedRow}</tbody></table>`;
}

function buildDocxCompactPreviewHtml(
  headers: string[],
  rows: Record<string, unknown>[],
  sourceUrl: string,
): string {
  const previewHeaders = (headers.length > 0 ? headers : ["Value"]).slice(0, 4);
  const previewRows = rows.slice(0, 20);
  const table = buildExportTableHtmlDocx(
    previewHeaders,
    previewRows,
    rows.length > previewRows.length,
  );

  return `${table}${buildDocxTableSourceNoteHtml(sourceUrl, true)}`;
}

function buildDocxTableSourceNoteHtml(
  sourceUrl: string,
  previewOnly = false,
): string {
  const prefix = previewOnly ? "Preview only. Source:" : "Source:";
  return `
    <p style="margin-top:6px;font-size:10px;color:#4b5563;">
      ${prefix}
      <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceUrl)}</a>
    </p>
  `;
}

function buildDocxTableWithSourceHtml(
  headers: string[],
  rows: Record<string, unknown>[],
  truncated: boolean,
  sourceUrl: string,
): string {
  const safeHeaders = headers.length > 0 ? headers : ["Value"];
  const tableHtml = buildExportTableHtmlDocx(safeHeaders, rows, truncated);
  return `${tableHtml}${buildDocxTableSourceNoteHtml(sourceUrl)}`;
}

function buildExportTableHtmlByTarget(
  headers: string[],
  rows: Record<string, unknown>[],
  truncated: boolean,
  target: ExportTarget,
  _compact: boolean,
): string {
  return buildExportTableHtmlDocx(headers, rows, truncated, target === "pdf");
}

function hydrateLayoutInExportHtml(
  html: string,
  _target: ExportTarget,
): string {

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div data-export-root="true">${html}</div>`,
    "text/html",
  );

  const root = doc.querySelector("[data-export-root='true']");
  if (!root) return html;

  const containers = root.querySelectorAll<HTMLElement>(
    "[data-lexical-layout-container='true']",
  );

  containers.forEach((container) => {
    const cols = Array.from(container.children)
      .map((child) =>
        ((child as HTMLElement).innerText || "").replace(/\s+/g, " ").trim(),
      )
      .filter(Boolean);

    const p = doc.createElement("p");
    p.innerHTML = `<strong>Columns:</strong> ${escapeHtml(cols.join(" | "))}`;
    container.replaceWith(p);
  });

  return root.innerHTML;
}

function splitHeaders(
  headers: string[],
  maxColsPerChunk = TABLE_COLUMNS_SPLIT_START,
): string[][] {
  if (headers.length === 0) return [["Value"]];
  if (headers.length <= maxColsPerChunk) {
    return [headers];
  }
  const result: string[][] = [];
  for (let index = 0; index < headers.length; index += maxColsPerChunk) {
    result.push(headers.slice(index, index + maxColsPerChunk));
  }
  return result;
}

function buildTableLinkFallbackHtml(sourceUrl: string, reason: string): string {
  const cardStyle =
    "border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;background:#f9fafb;margin:10px 0;";
  const titleStyle = "font-weight:600;margin-bottom:4px;";
  const textStyle = "color:#4b5563;font-size:12px;margin-bottom:6px;";
  return `
    <div style="${cardStyle}">
      <div style="${titleStyle}">MWS Table</div>
      <div style="${textStyle}">${escapeHtml(reason)}</div>
      <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceUrl)}</a>
    </div>
  `;
}

function buildMarkdownTable(
  headers: string[],
  rows: Record<string, unknown>[],
  truncated: boolean,
  sourceUrl: string,
): string {
  const headerPool = headers.length > 0 ? headers : ["Value"];
  const selectedHeaders = selectMarkdownPreviewColumns(headerPool);
  const normalizedHeaders =
    selectedHeaders.length > 0
      ? selectedHeaders.slice(0, MARKDOWN_TABLE_MAX_COLUMNS)
      : headerPool.slice(0, MARKDOWN_TABLE_MAX_COLUMNS);
  const limitedRows = rows.slice(0, MARKDOWN_TABLE_MAX_ROWS);
  const truncatedByMarkdownPolicy =
    rows.length > MARKDOWN_TABLE_MAX_ROWS || headers.length > MARKDOWN_TABLE_MAX_COLUMNS;
  const summaryLine = `**MWS Table:** ${rows.length} rows, ${headers.length} columns.`;
  const headerLine = `| ${normalizedHeaders
    .map((header) => escapeMarkdownCell(header))
    .join(" | ")} |`;
  const dividerLine = `| ${normalizedHeaders.map(() => "---").join(" | ")} |`;
  const bodyLines = limitedRows.map((row) => {
    const cells = normalizedHeaders.map((header) =>
      escapeMarkdownCell(
        truncateMarkdownCell(
          normalizeMarkdownTableCell(stringifyTableCellValue(row[header])),
        ),
      ),
    );
    return `| ${cells.join(" | ")} |`;
  });
  if (truncated || truncatedByMarkdownPolicy) {
    bodyLines.push("");
    bodyLines.push("> Table was truncated for Markdown export.");
    bodyLines.push("> Original:");
    bodyLines.push(`> ${sourceUrl}`);
  }
  return [summaryLine, "", headerLine, dividerLine, ...bodyLines].join("\n");
}

function selectMarkdownPreviewColumns(headers: string[]): string[] {
  const preferred = ["name", "title", "text", "test", "workspace"];
  const normalized = headers.map((header) => ({ header, low: header.toLowerCase() }));
  const selected: string[] = [];

  for (const keyword of preferred) {
    const match = normalized.find((item) => item.low.includes(keyword));
    if (match && !selected.includes(match.header)) {
      selected.push(match.header);
      if (selected.length >= MARKDOWN_TABLE_MAX_COLUMNS) {
        return selected;
      }
    }
  }

  for (const item of normalized) {
    if (!selected.includes(item.header)) {
      selected.push(item.header);
      if (selected.length >= MARKDOWN_TABLE_MAX_COLUMNS) {
        break;
      }
    }
  }

  return selected;
}

function shouldRenderAsPrettyTable(
  headers: string[],
  rows: Record<string, unknown>[],
): { allowed: boolean; reason?: string } {
  const rowCount = rows.length;
  const colCount = headers.length;
  const totalCells = rowCount * Math.max(1, colCount);

  if (colCount > PRETTY_TABLE_MAX_COLUMNS) {
    return { allowed: false, reason: `Too many columns (${colCount}).` };
  }
  if (rowCount > PRETTY_TABLE_MAX_ROWS) {
    return { allowed: false, reason: `Too many rows (${rowCount}).` };
  }
  if (totalCells > PRETTY_TABLE_MAX_CELLS) {
    return { allowed: false, reason: `Too many cells (${totalCells}).` };
  }

  let longCells = 0;
  for (const row of rows) {
    for (const header of headers) {
      const value = stringifyTableCellValue(row[header]);
      if (value.length > PRETTY_TABLE_MAX_CELL_LENGTH) {
        longCells += 1;
        if (longCells > PRETTY_TABLE_MAX_LONG_CELLS) {
          return {
            allowed: false,
            reason: "Too many long cell values.",
          };
        }
      }
    }
  }

  return { allowed: true };
}


async function hydrateTablesInExportHtml(
  html: string,
  target: ExportTarget,
): Promise<string> {
  const parser = new DOMParser();
  const document = parser.parseFromString(
    `<div data-export-root="true">${html}</div>`,
    "text/html",
  );

  const root = document.querySelector("[data-export-root='true']");
  if (!root) return html;

  const blocks = Array.from(
    root.querySelectorAll<HTMLElement>("[data-lexical-tables-mw='true']"),
  );

  await Promise.all(
    blocks.map(async (block) => {
      const link = block.querySelector("a");
      const sourceUrl =
        block.getAttribute("data-url") ||
        link?.getAttribute("href") ||
        link?.textContent?.trim();
      if (!sourceUrl) return;

      const data = await loadTablesData(sourceUrl);
      if (!data) return;
      const policy = shouldRenderAsPrettyTable(data.headers, data.rows);
      const browserUrl =
        data.browserUrl || parseTablesMwUrl(sourceUrl)?.browserUrl || sourceUrl;
      if (!policy.allowed) {
        block.innerHTML =
          target === "docx" || target === "pdf"
            ? buildDocxCompactPreviewHtml(data.headers, data.rows, browserUrl)
            : buildTableLinkFallbackHtml(
                browserUrl,
                policy.reason || "Table is too large for pretty export.",
              );
        return;
      }
      const headerChunks = splitHeaders(
        data.headers,
        target === "docx" ? DOCX_MAX_COLUMNS_PER_CHUNK : TABLE_COLUMNS_SPLIT_START,
      );
      if (target === "docx" && headerChunks.length > DOCX_MAX_TABLE_PARTS) {
        block.innerHTML = buildDocxCompactPreviewHtml(data.headers, data.rows, browserUrl);
        return;
      }
      const compact = data.headers.length >= TABLE_COLUMNS_LANDSCAPE_START;
      block.innerHTML = headerChunks
        .map((headersChunk, index) => {
          const tableHtml = buildExportTableHtmlByTarget(
            headersChunk,
            data.rows,
            data.truncated,
            target,
            compact,
          );
          if (target === "docx") {
            return buildDocxTableWithSourceHtml(
              headersChunk,
              data.rows,
              data.truncated,
              browserUrl,
            );
          }
          const tableWithSource = `${tableHtml}${buildDocxTableSourceNoteHtml(browserUrl)}`;
          if (headerChunks.length === 1) return tableWithSource;
          return `<div style="margin:6px 0 2px;font-weight:600;font-size:11px;color:#4b5563;">Part ${index + 1}/${headerChunks.length}</div>${tableWithSource}`;
        })
        .join("");
    }),
  );

  return root.innerHTML;
}

async function hydrateTablesInMarkdown(markdown: string): Promise<string> {
  const lines = markdown.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const url = extractTablesMwUrlFromMarkdownLine(line);

    if (!url) {
      result.push(line);
      continue;
    }

    const data = await loadTablesData(url);
    if (!data) {
      const originalUrl = parseTablesMwUrl(url)?.browserUrl || url;
      result.push("> MWS table is unavailable for export.");
      result.push("> Original:");
      result.push(`> ${originalUrl}`);
      continue;
    }

    const policy = shouldRenderAsPrettyTable(data.headers, data.rows);
    if (!policy.allowed) {
      result.push(
        `> MWS table is too large for full Markdown export${policy.reason ? `: ${policy.reason}` : ""}.`,
      );
      result.push("> Original:");
      result.push(`> ${data.browserUrl}`);
      continue;
    }

    result.push(
      buildMarkdownTable(
        data.headers,
        data.rows,
        data.truncated,
        data.browserUrl,
      ),
    );
  }

  return result.join("\n");
}

export function ImportExportPlugin({
  documentTitle,
  documentDescription,
}: {
  documentTitle?: string;
  documentDescription?: string;
}) {
  const [editor] = useLexicalComposerContext();
  const [activeExport, setActiveExport] = useState<ExportFormat | null>(null);
  const baseFileName = useMemo(
    () => safeBaseFileName(documentTitle),
    [documentTitle],
  );

  useEffect(() => {
    const reset = () => setActiveExport(null);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        reset();
      }
    };

    window.addEventListener("pageshow", reset);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pageshow", reset);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (activeExport) return;

      try {
        setActiveExport(format);
        if (format === "docx" && typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "wikilive:docx-export-started-at",
            String(Date.now()),
          );
        }

        if (format === "markdown") {
          const html = editor.getEditorState().read(() =>
            $generateHtmlFromNodes(editor, null),
          );
          const rawMarkdown = editor.getEditorState().read(() =>
            $convertToMarkdownString(
              MARKDOWN_TRANSFORMERS,
              undefined,
              true,
            ),
          );
          const markdownWithCustomBlocks = enrichMarkdownWithCustomBlocks(
            rawMarkdown,
            html,
          );
          const markdownWithoutBase64 = replaceBase64ImagesInMarkdown(markdownWithCustomBlocks);
          const markdownWithTables = await hydrateTablesInMarkdown(markdownWithoutBase64);
          const finalMarkdown = applySoftBreaksToMarkdown(markdownWithTables);
          saveBlob(
            new Blob([finalMarkdown], { type: "text/markdown;charset=utf-8" }),
            `${baseFileName}.md`,
          );
          toast.success("Markdown exported");
          return;
        }

        const html = editor.getEditorState().read(() =>
          $generateHtmlFromNodes(editor, null),
        );

        const preparedHtml = hydrateLayoutInExportHtml(
          html,
          format === "docx" ? "docx" : "pdf",
        );

        const htmlWithTables = await hydrateTablesInExportHtml(
          preparedHtml,
          format === "docx" ? "docx" : "pdf",
        );

        let finalHtml = htmlWithTables;
        if (format === "pdf") {
          const pdfStyles = `
            <style>
              body { font-family: sans-serif; }
              pre, code { 
                font-family: sans-serif !important; 
                background: #f4f4f4; 
                padding: 4px; 
                border-radius: 4px; 
                word-break: break-all !important; 
                word-wrap: break-word !important; 
                white-space: pre-wrap !important;
              }
              table { table-layout: fixed; width: 100%; border-collapse: collapse; }
              td, th { word-break: break-all !important; overflow-wrap: anywhere !important; }
            </style>
          `;
          finalHtml = pdfStyles + htmlWithTables.replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u200C-\u200F\u2028-\u202E\uFEFF]/g, "");
          finalHtml = finalHtml.replaceAll("\u00A0", " ");
        }

        const response = await fetchWithTimeout("/api/wiki/export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            format,
            title: documentTitle || "Document",
            description: documentDescription || null,
            html: finalHtml,
          }),
        });

        if (!response.ok) {
          throw new Error(await readResponseError(response));
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition");
        const fallbackName = `${baseFileName}.${format}`;
        const fileName = parseFileNameFromDisposition(disposition) || fallbackName;
        saveBlob(blob, fileName);
        toast.success(format === "pdf" ? "PDF exported" : "DOCX exported");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to export file",
        );
      } finally {
        setActiveExport(null);
      }
    },
    [activeExport, baseFileName, documentDescription, documentTitle, editor],
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={"ghost"}
            onClick={() => importFile(editor)}
            title="Import"
            aria-label="Import editor state from JSON"
            size={"sm"}
            className="p-2"
          >
            <UploadIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Import JSON</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={"ghost"}
                title="Export"
                aria-label="Export content"
                size={"sm"}
                className="p-2"
                disabled={activeExport !== null}
              >
                <DownloadIcon
                  className={`size-4 ${activeExport ? "animate-pulse" : ""}`}
                />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Export</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => void handleExport("markdown")}
            disabled={activeExport !== null}
            className="gap-2"
          >
            <FileTextIcon className="size-4" />
            Markdown (.md)
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void handleExport("pdf")}
            disabled={activeExport !== null}
            className="gap-2"
          >
            <DownloadIcon className="size-4" />
            PDF (.pdf)
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void handleExport("docx")}
            disabled={activeExport !== null}
            className="gap-2"
          >
            <DownloadIcon className="size-4" />
            Word (.docx)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}




