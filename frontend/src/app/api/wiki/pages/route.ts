import { type NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL =
  (process.env.BACKEND_URL || "http://localhost:8085").replace(/\/+$/, "");

const PAGES_API_URL = `${BACKEND_BASE_URL}/api/pages`;

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

    return NextResponse.json(data, { status: response.status });
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

    const response = await fetch(PAGES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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

    return NextResponse.json(data, { status: response.status });
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
