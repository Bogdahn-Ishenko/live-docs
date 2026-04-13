import { type NextRequest, NextResponse } from "next/server";

import {
  getWikiBackendBaseUrl,
  getWikiWriteAuthHeader,
} from "@/app/api/wiki/_lib/backend-config";
import { buildWritePayload, normalizePageShape } from "@/app/api/wiki/_lib/page";

const PAGES_API_URL = `${getWikiBackendBaseUrl()}/api/pages`;

export async function GET() {
  try {
    const response = await fetch(PAGES_API_URL, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        data ?? {
          error: "Не удалось получить список документов",
        },
        { status: response.status },
      );
    }

    const normalized = Array.isArray(data)
      ? data.map((page) => normalizePageShape(page))
      : data;
    return NextResponse.json(normalized, { status: response.status });
  } catch (error) {
    console.error("Wiki pages list fetch failed:", error);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const writeAuthHeader = getWikiWriteAuthHeader();

    if (!writeAuthHeader) {
      return NextResponse.json(
        {
          error: "На сервере не настроены учетные данные для записи",
        },
        { status: 500 },
      );
    }

    const response = await fetch(PAGES_API_URL, {
      method: "POST",
      headers: {
        Authorization: writeAuthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildWritePayload(payload)),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        data ?? {
          error: "Не удалось создать документ",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(normalizePageShape(data), {
      status: response.status,
    });
  } catch (error) {
    console.error("Wiki page create failed:", error);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
      },
      { status: 500 },
    );
  }
}
