import { type NextRequest, NextResponse } from "next/server";

const API_BASE = "https://tables.mws.ru";
const AUTH_TOKEN = "Bearer uskHudJhxskxRj6UUSV3sjX";

// POST - Upload attachment
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const datasheetId = searchParams.get("datasheetId");

  if (!datasheetId) {
    return NextResponse.json(
      { error: "Missing datasheetId parameter" },
      { status: 400 }
    );
  }

  // Validate datasheetId format (should be like dstz0ig7UkXhZrTKe7)
  if (!/^dst[a-zA-Z0-9]+$/.test(datasheetId)) {
    return NextResponse.json(
      { error: "Invalid datasheetId format" },
      { status: 400 }
    );
  }

  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file in request" },
        { status: 400 }
      );
    }

    // Create new FormData for the upstream API
    const upstreamFormData = new FormData();
    upstreamFormData.append("file", file);

    // Upload to tables.mws.ru API
    const uploadUrl = `${API_BASE}/fusion/v1/datasheets/${datasheetId}/attachments`;
    
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: AUTH_TOKEN,
      },
      body: upstreamFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Upload failed:", errorData);
      return NextResponse.json(
        { error: "Failed to upload attachment", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
