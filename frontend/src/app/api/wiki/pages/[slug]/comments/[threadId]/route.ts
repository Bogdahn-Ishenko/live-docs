import { type NextRequest, NextResponse } from "next/server";

import {
  getWikiBackendBaseUrl,
  getWikiWriteAuthHeader,
} from "@/app/api/wiki/_lib/backend-config";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string; threadId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { slug, threadId } = await params;
    const payload = await request.json();
    const writeAuthHeader = getWikiWriteAuthHeader();

    if (!writeAuthHeader) {
      return NextResponse.json(
        { error: "На сервере не настроены учетные данные для записи" },
        { status: 500 },
      );
    }

    const response = await fetch(
      `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(slug)}/comments/${threadId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: writeAuthHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        data ?? { error: "Не удалось обновить ветку комментариев" },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Wiki comment thread patch failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
