import { type NextRequest, NextResponse } from "next/server";

import {
  getWikiBackendBaseUrl,
  getWikiWriteAuthHeader,
} from "@/app/api/wiki/_lib/backend-config";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string; threadId: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
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

    const demoUser = request.headers.get("x-demo-user");
    const demoUserName = request.headers.get("x-demo-user-name");

    const response = await fetch(
      `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(slug)}/comments/${threadId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: writeAuthHeader,
          "Content-Type": "application/json",
          ...(demoUser ? { "X-Demo-User": demoUser } : {}),
          ...(demoUserName ? { "X-Demo-User-Name": demoUserName } : {}),
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        data ?? { error: "Не удалось добавить комментарий" },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Wiki comment message create failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
