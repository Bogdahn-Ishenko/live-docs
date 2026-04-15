import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import { proxyToBackend } from "@/app/api/wiki/_lib/proxy";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(
      slug,
    )}/backlinks`;

    return await proxyToBackend(request, backendUrl, { method: "GET" });
  } catch (error) {
    console.error("Wiki backlinks fetch failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
