import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import { proxyToBackend } from "@/app/api/wiki/_lib/proxy";
import { encodeSlugPath } from "@/app/api/wiki/_lib/slug";

type Params = {
  params: Promise<{ slug: string; threadId: string; messageId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { slug, threadId, messageId } = await params;
    const payload = await request.json();

    const extraHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const demoUser = request.headers.get("x-demo-user");
    if (demoUser) extraHeaders["X-Demo-User"] = demoUser;

    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/${encodeSlugPath(
      slug,
    )}/comments/${threadId}/messages/${messageId}`;

    return await proxyToBackend(request, backendUrl, {
      method: "PATCH",
      requiresAuth: true,
      body: JSON.stringify(payload),
      extraHeaders,
    });
  } catch (error) {
    console.error("Wiki comment message patch failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
