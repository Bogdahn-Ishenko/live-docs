import { NextResponse } from "next/server";

import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? "";
    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/search?query=${encodeURIComponent(
      query,
    )}`;

    const response = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        data ?? { error: "Не удалось выполнить поиск" },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Wiki page search failed:", error);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
      },
      { status: 500 },
    );
  }
}
