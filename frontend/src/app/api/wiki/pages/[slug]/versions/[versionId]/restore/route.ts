import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import { proxyToBackend } from "@/app/api/wiki/_lib/proxy";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string; versionId: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { slug, versionId } = await params;
    const url = new URL(request.url);
    const queryString = url.searchParams.toString();

    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(
      slug,
    )}/versions/${encodeURIComponent(versionId)}/restore${
      queryString ? `?${queryString}` : ""
    }`;

    return await proxyToBackend(request, backendUrl, {
      method: "POST",
      requiresAuth: true,
    });
  } catch (error) {
    console.error("Wiki version restore failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
