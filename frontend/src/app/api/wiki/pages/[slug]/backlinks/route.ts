import { NextResponse } from "next/server";

import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const response = await fetch(
      `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(slug)}/backlinks`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        data ?? { error: "Не удалось получить обратные ссылки" },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Wiki backlinks fetch failed:", error);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
      },
      { status: 500 },
    );
  }
}
