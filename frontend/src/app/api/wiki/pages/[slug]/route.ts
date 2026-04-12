import { type NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL =
  (process.env.BACKEND_URL || "http://localhost:8085").replace(/\/+$/, "");

type Params = {
  params: Promise<{ slug: string }>;
};

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

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const response = await fetch(
      `${BACKEND_BASE_URL}/api/pages/${encodeSlugPath(slug)}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        data ?? {
          error: "Не удалось получить документ",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Wiki page fetch failed:", error);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const payload = await request.json();

    const response = await fetch(
      `${BACKEND_BASE_URL}/api/pages/${encodeSlugPath(slug)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        data ?? {
          error: "Не удалось обновить документ",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Wiki page update failed:", error);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
      },
      { status: 500 },
    );
  }
}
