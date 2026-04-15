import { type NextRequest, NextResponse } from "next/server";
import { getWikiWriteAuthHeader } from "./backend-config";

const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
];

export async function proxyToBackend(
  request: NextRequest,
  backendUrl: string,
  options: {
    method?: string;
    requiresAuth?: boolean;
    body?: BodyInit | null;
    extraHeaders?: Record<string, string>;
  } = {},
): Promise<NextResponse> {
  const authHeader = options.requiresAuth ? getWikiWriteAuthHeader() : null;

  if (options.requiresAuth && !authHeader) {
    return NextResponse.json(
      { error: "На сервере не настроены учетные данные для записи" },
      { status: 500 },
    );
  }

  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  if (options.extraHeaders) {
    for (const [key, value] of Object.entries(options.extraHeaders)) {
      headers.set(key, value);
    }
  }

  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

  const response = await fetch(backendUrl, {
    method: options.method ?? request.method,
    headers,
    body: options.body ?? null,
    cache: "no-store",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("www-authenticate");

  const contentLength = responseHeaders.get("content-length");
  if (response.status === 204 || contentLength === "0") {
    return new NextResponse(null, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  const contentType = responseHeaders.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Ошибка upstream" }, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  const text = await response.text().catch(() => "");
  return new NextResponse(text, {
    status: response.status,
    headers: responseHeaders,
  });
}
