import { type NextRequest, NextResponse } from "next/server";

import {
  getWikiBackendBaseUrl,
  getWikiWriteAuthHeader,
} from "@/app/api/wiki/_lib/backend-config";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string; threadId: string; messageId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { slug, threadId, messageId } = await params;
    const payload = await request.json();
    const writeAuthHeader = getWikiWriteAuthHeader();

    if (!writeAuthHeader) {
      return NextResponse.json(
        { error: "На сервере не настроены учетные данные для записи" },
        { status: 500 },
      );
    }

    const demoUser = request.headers.get("x-demo-user");

    const response = await fetch(
      `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(slug)}/comments/${threadId}/messages/${messageId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: writeAuthHeader,
          "Content-Type": "application/json",
          ...(demoUser ? { "X-Demo-User": demoUser } : {}),
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        data ?? { error: "Не удалось обновить комментарий" },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Wiki comment message patch failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
