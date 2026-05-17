import { NextRequest, NextResponse } from "next/server";
import {
  getWikiBackendBaseUrl,
  getWikiWriteAuthHeader,
} from "@/app/api/wiki/_lib/backend-config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, password } = body;

    if (!login || !password) {
      return NextResponse.json(
        { error: "Требуются логин и пароль" },
        { status: 400 },
      );
    }

    // Create auth header from provided credentials
    const authHeader = `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;

    // Test the credentials by making a request to a protected endpoint
    // Using /api/pages since it requires auth for POST
    const backendUrl = `${getWikiBackendBaseUrl()}/api/pages`;
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              Name: "Auth Test Page",
              Content: "Test page for authentication verification",
            },
          },
        ],
      }),
    });

    if (response.status === 401) {
      return NextResponse.json(
        { error: "Неверные учетные данные" },
        { status: 401 },
      );
    }

    // If we get here, auth is successful
    // Return success and the user info
    return NextResponse.json({
      ok: true,
      login,
      displayName: body.displayName || login,
      roles: ["editor"], // Default role for authenticated users
    });
  } catch (error) {
    console.error("Wiki auth login failed:", error);
    return NextResponse.json(
      { 
        ok: false, 
        error: "Не удалось связаться с бэкендом",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
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

    // Check current auth state by making a test request
    const response = await fetch(`${getWikiBackendBaseUrl()}/api/pages`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              Name: "Auth Check Page",
              Content: "Checking authentication state",
            },
          },
        ],
      }),
    });

    if (response.status === 401) {
      return NextResponse.json(
        { ok: false, error: "Сессия истекла или неверные учетные данные" },
        { status: 401 },
      );
    }

    // Return current auth state
    const authHeaderParsed = authHeader.replace("Basic ", "");
    const decodedAuth = JSON.parse(
      Buffer.from(authHeaderParsed, "base64").toString("utf-8"),
    );

    return NextResponse.json({
      ok: true,
      login: decodedAuth.login,
      displayName: decodedAuth.login,
      roles: ["editor"],
    });
  } catch (error) {
    console.error("Wiki auth check failed:", error);
    return NextResponse.json(
      { 
        ok: false, 
        error: "Не удалось проверить состояние аутентификации",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // For now, just clear the auth from environment
    // In a real implementation with sessions, you'd invalidate the session
    
    return NextResponse.json({
      ok: true,
      message: "Выход выполнен успешно",
    });
  } catch (error) {
    console.error("Wiki auth logout failed:", error);
    return NextResponse.json(
      { 
        ok: false, 
        error: "Не удалось выполнить выход",
      },
      { status: 500 },
    );
  }
}
