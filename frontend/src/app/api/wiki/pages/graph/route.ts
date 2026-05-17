import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import { proxyToBackend } from "@/app/api/wiki/_lib/proxy";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/graph`;
    return await proxyToBackend(request, backendUrl, { method: "GET" });
  } catch (error) {
    console.error("Wiki graph fetch failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
