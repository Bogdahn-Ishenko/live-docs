import { type NextRequest, NextResponse } from "next/server";

import {
  getWikiBackendBaseUrl,
  getWikiWriteAuthHeader,
} from "@/app/api/wiki/_lib/backend-config";
import { buildWritePayload, normalizePageShape } from "@/app/api/wiki/_lib/page";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const response = await fetch(
      `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(slug)}`,
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

    return NextResponse.json(normalizePageShape(data), {
      status: response.status,
    });
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
    const writeAuthHeader = getWikiWriteAuthHeader();

    if (!writeAuthHeader) {
      return NextResponse.json(
        {
          error: "На сервере не настроены учетные данные для записи",
        },
        { status: 500 },
      );
    }

    const response = await fetch(
      `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(slug)}`,
      {
        method: "PUT",
        headers: {
          Authorization: writeAuthHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildWritePayload(payload)),
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

    return NextResponse.json(normalizePageShape(data), {
      status: response.status,
    });
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

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const writeAuthHeader = getWikiWriteAuthHeader();

    if (!writeAuthHeader) {
      return NextResponse.json(
        {
          error: "На сервере не настроены учетные данные для записи",
        },
        { status: 500 },
      );
    }

    const response = await fetch(
      `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(slug)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: writeAuthHeader,
        },
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return NextResponse.json(
        data ?? {
          error: "Не удалось удалить документ",
        },
        { status: response.status },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Wiki page delete failed:", error);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
      },
      { status: 500 },
    );
  }
}
