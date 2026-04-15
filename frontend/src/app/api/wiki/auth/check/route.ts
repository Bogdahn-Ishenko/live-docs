import { NextResponse } from "next/server";
import {
  getWikiBackendBaseUrl,
  getWikiWriteAuthHeader,
} from "@/app/api/wiki/_lib/backend-config";

export async function GET() {
  try {
    const authHeader = getWikiWriteAuthHeader();

    if (!authHeader) {
      return NextResponse.json(
        {
          ok: false,
          error: "На сервере не настроены учетные данные для записи",
        },
        { status: 500 },
      );
    }

    // Делаем тестовый запрос на защищенный эндпоинт (дерево страниц может быть легким,
    // но требует auth? Нет, tree публичный. Попробуем /api/pages — он тоже публичный.
    // Нужен защищенный эндпоинт. Возьмем любой: например, GET на /api/pages/slug/draft,
    // но slug неизвестен. Лучше POST на /api/pages с пустым телом — бэк вернет 400 или 401.
    // Главное — отличить 401 от остальных.)
    const response = await fetch(`${getWikiBackendBaseUrl()}/api/pages`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    if (response.status === 401) {
      return NextResponse.json(
        { ok: false, error: "Неверные учетные данные" },
        { status: 401 },
      );
    }

    // 400, 200, 201 и т.д. означают что auth прошел (бэк принял заголовок)
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Wiki auth check failed:", error);
    return NextResponse.json(
      { ok: false, error: "Не удалось связаться с бэкендом" },
      { status: 502 },
    );
  }
}
