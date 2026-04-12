import { type NextRequest, NextResponse } from "next/server";

const API_BASE = "https://tables.mws.ru";
const AUTH_TOKEN = `Bearer ${process.env.MWS_BACKEND_API_KEY}`;

function validatePath(path: string | null): boolean {
  if (!path) return false;
  return path.startsWith("/fusion/v1/datasheets/");
}

function buildApiUrl(request: NextRequest): { url: string; error?: string } {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path");

  if (!path) {
    return { url: "", error: "Missing path parameter" };
  }

  if (!validatePath(path)) {
    return { url: "", error: "Invalid path" };
  }

  // Build query string from all params except 'path'
  const queryParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== "path") {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  return {
    url: `${API_BASE}${path}${queryString ? `?${queryString}` : ""}`,
  };
}

// GET - Fetch records
export async function GET(request: NextRequest) {
  const { url, error } = buildApiUrl(request);
  
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: AUTH_TOKEN,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch data" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Create records
export async function POST(request: NextRequest) {
  const { url, error } = buildApiUrl(request);
  
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const body = await request.json();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: AUTH_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to create records", details: errorData },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH - Update records
export async function PATCH(request: NextRequest) {
  const { url, error } = buildApiUrl(request);
  
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const body = await request.json();

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: AUTH_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to update records", details: errorData },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Delete records
export async function DELETE(request: NextRequest) {
  const { url, error } = buildApiUrl(request);
  
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: AUTH_TOKEN,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to delete records", details: errorData },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
