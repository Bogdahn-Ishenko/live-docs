import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import { proxyToBackend } from "@/app/api/wiki/_lib/proxy";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string; threadId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { slug, threadId } = await params;
    const payload = await request.json();
    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(
      slug,
    )}/comments/${threadId}`;

    return await proxyToBackend(request, backendUrl, {
      method: "PATCH",
      requiresAuth: true,
      body: JSON.stringify(payload),
      extraHeaders: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Wiki comment thread patch failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { slug, threadId } = await params;
    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(
      slug,
    )}/comments/${threadId}`;

    return await proxyToBackend(request, backendUrl, {
      method: "DELETE",
      requiresAuth: true,
    });
  } catch (error) {
    console.error("Wiki comment thread delete failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
