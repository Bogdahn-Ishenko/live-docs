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
    )}/comments`;

    return await proxyToBackend(request, backendUrl, { method: "GET" });
  } catch (error) {
    console.error("Wiki comments fetch failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const payload = await request.json();

    const extraHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const demoUser = request.headers.get("x-demo-user");
    const demoUserName = request.headers.get("x-demo-user-name");
    if (demoUser) extraHeaders["X-Demo-User"] = demoUser;
    if (demoUserName) extraHeaders["X-Demo-User-Name"] = demoUserName;

    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(
      slug,
    )}/comments/threads`;

    return await proxyToBackend(request, backendUrl, {
      method: "POST",
      requiresAuth: true,
      body: JSON.stringify(payload),
      extraHeaders,
    });
  } catch (error) {
    console.error("Wiki comment thread create failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
