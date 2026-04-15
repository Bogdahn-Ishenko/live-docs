import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import {
  buildWritePayload,
  normalizePageShape,
} from "@/app/api/wiki/_lib/page";
import { proxyToBackend } from "@/app/api/wiki/_lib/proxy";

const PAGES_API_URL = `${getWikiBackendBaseUrl()}/api/pages`;

export async function GET() {
  try {
    const response = await fetch(PAGES_API_URL, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const headers = new Headers(response.headers);
      headers.delete("www-authenticate");
      return NextResponse.json(
        data ?? { error: "Не удалось получить список документов" },
        { status: response.status, headers },
      );
    }

    const normalized = Array.isArray(data)
      ? data.map((page) => normalizePageShape(page))
      : data;

    const headers = new Headers(response.headers);
    headers.delete("www-authenticate");
    return NextResponse.json(normalized, { status: response.status, headers });
  } catch (error) {
    console.error("Wiki pages list fetch failed:", error);
    const details =
      error instanceof Error ? error.message : "Unknown upstream error";
    return NextResponse.json(
      {
        error: "Не удалось подключиться к backend Wiki",
        details,
        backendUrl: getWikiBackendBaseUrl(),
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    return await proxyToBackend(request, PAGES_API_URL, {
      method: "POST",
      requiresAuth: true,
      body: JSON.stringify(buildWritePayload(payload)),
      extraHeaders: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Wiki page create failed:", error);
    const details =
      error instanceof Error ? error.message : "Unknown upstream error";
    return NextResponse.json(
      {
        error: "Не удалось создать страницу: backend недоступен",
        details,
        backendUrl: getWikiBackendBaseUrl(),
      },
      { status: 502 },
    );
  }
}
