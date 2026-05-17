import { type NextRequest, NextResponse } from "next/server";
import { getWikiBackendBaseUrl } from "@/app/api/wiki/_lib/backend-config";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const expectedLogin = process.env.WIKILIVE_WRITE_LOGIN?.trim();
    const expectedPassword = process.env.WIKILIVE_WRITE_PASSWORD?.trim();

    if (!expectedLogin || !expectedPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "На сервере не настроены учетные данные для записи",
        },
        { status: 500 },
      );
    }

    if (username === expectedLogin && password === expectedPassword) {
      return NextResponse.json({ ok: true });
    }

    const token = Buffer.from(`${username ?? ""}:${password ?? ""}`).toString(
      "base64",
    );
    const testRes = await fetch(`${getWikiBackendBaseUrl()}/api/pages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    if (testRes.status === 401) {
      return NextResponse.json(
        { ok: false, error: "Неверный логин или пароль" },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Wiki auth login failed:", error);
    return NextResponse.json(
      { ok: false, error: "Ошибка сервера" },
      { status: 500 },
    );
  }
}
