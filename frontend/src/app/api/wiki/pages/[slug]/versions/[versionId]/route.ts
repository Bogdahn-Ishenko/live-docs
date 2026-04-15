import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import { proxyToBackend } from "@/app/api/wiki/_lib/proxy";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string; versionId: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { slug, versionId } = await params;
    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(
      slug,
    )}/versions/${encodeURIComponent(versionId)}`;

    return await proxyToBackend(request, backendUrl, {
      method: "GET",
      requiresAuth: true,
    });
  } catch (error) {
    console.error("Wiki version fetch failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
