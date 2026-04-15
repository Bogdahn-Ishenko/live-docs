import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";
import { proxyToBackend } from "@/app/api/wiki/_lib/proxy";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const queryString = url.searchParams.toString();
    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages/tree${
      queryString ? `?${queryString}` : ""
    }`;

    return await proxyToBackend(request, backendUrl, { method: "GET" });
  } catch (error) {
    console.error("Wiki pages tree fetch failed:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
