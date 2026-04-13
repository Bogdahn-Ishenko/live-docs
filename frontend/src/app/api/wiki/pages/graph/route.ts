import { NextResponse } from "next/server";

import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";

export async function GET() {
  try {
    const response = await fetch(`${getWikiBackendBaseUrl()}/api/pages/graph`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        data ?? { error: "Не удалось получить граф страниц" },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Wiki graph fetch failed:", error);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
      },
      { status: 500 },
    );
  }
}
