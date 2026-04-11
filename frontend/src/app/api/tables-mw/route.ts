import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: "Missing path parameter" },
      { status: 400 },
    );
  }

  // Validate path to prevent abuse
  if (!path.startsWith("/fusion/v1/datasheets/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Build query string from all params except 'path'
  const queryParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== "path") {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  const apiUrl = `https://tables.mws.ru${path}${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: "Bearer uskHudJhxskxRj6UUSV3sjX",
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
