import { type NextRequest, NextResponse } from "next/server";

import {
  getWikiBackendBaseUrl,
  getWikiWriteAuthHeader,
} from "@/app/api/wiki/_lib/backend-config";

export const runtime = "nodejs";

const EXPORT_API_URL = `${getWikiBackendBaseUrl()}/api/pages/export`;

type ExportRequestPayload = {
  format?: string;
  title?: string;
  description?: string | null;
  html?: string;
};

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as ExportRequestPayload;
    const writeAuthHeader = getWikiWriteAuthHeader();

    if (!writeAuthHeader) {
      return NextResponse.json(
        {
          error: "На сервере не настроены учетные данные для записи",
        },
        { status: 500 },
      );
    }

    const response = await fetch(EXPORT_API_URL, {
      method: "POST",
      headers: {
        Authorization: writeAuthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        format: payload.format,
        title: payload.title,
        description: payload.description ?? null,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return NextResponse.json(
        data ?? {
          error: "Не удалось выгрузить файл",
        },
        { status: response.status },
      );
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get("Content-Type") || "application/octet-stream";
    const contentDisposition = response.headers.get("Content-Disposition");

    const headers = new Headers({
      "Cache-Control": "no-store",
      "Content-Type": contentType,
    });
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    }

    return new NextResponse(bytes, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Wiki export failed:", error);
    const details =
      error instanceof Error ? error.message : "Unknown upstream error";
    return NextResponse.json(
      {
        error: "Не удалось выгрузить файл: backend недоступен",
        details,
        backendUrl: getWikiBackendBaseUrl(),
      },
      { status: 502 },
    );
  }
}
