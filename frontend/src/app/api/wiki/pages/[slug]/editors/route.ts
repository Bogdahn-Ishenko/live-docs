import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import { proxyToBackend } from "@/app/api/wiki/_lib/proxy";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const payload = await request.json();
    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(
      slug,
    )}/editors`;

    return await proxyToBackend(request, backendUrl, {
      method: "POST",
      requiresAuth: true,
      body: JSON.stringify(payload),
      extraHeaders: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Wiki editor add failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
