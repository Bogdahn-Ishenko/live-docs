import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import {
  buildWritePayload,
  normalizePageShape,
} from "@/app/api/wiki/_lib/page";
import { proxyToBackend } from "@/app/api/wiki/_lib/proxy";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string }>;
};

function buildPageUrl(slug: string): string {
  return `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(slug)}`;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const response = await fetch(buildPageUrl(slug), {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const headers = new Headers(response.headers);
      headers.delete("www-authenticate");
      return NextResponse.json(
        data ?? { error: "Не удалось получить документ" },
        { status: response.status, headers },
      );
    }

    const headers = new Headers(response.headers);
    headers.delete("www-authenticate");
    return NextResponse.json(normalizePageShape(data), {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Wiki page fetch failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const payload = await request.json();

    return await proxyToBackend(request, buildPageUrl(slug), {
      method: "PUT",
      requiresAuth: true,
      body: JSON.stringify(buildWritePayload(payload)),
      extraHeaders: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Wiki page update failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    return await proxyToBackend(_request, buildPageUrl(slug), {
      method: "DELETE",
      requiresAuth: true,
    });
  } catch (error) {
    console.error("Wiki page delete failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
