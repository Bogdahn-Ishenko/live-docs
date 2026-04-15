import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import { proxyToBackend } from "@/app/api/wiki/_lib/proxy";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string; username: string }>;
};

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { slug, username } = await params;
    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(
      slug,
    )}/editors/${encodeURIComponent(username)}`;

    return await proxyToBackend(request, backendUrl, {
      method: "DELETE",
      requiresAuth: true,
    });
  } catch (error) {
    console.error("Wiki editor remove failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
