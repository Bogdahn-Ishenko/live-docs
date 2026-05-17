import { NextResponse } from "next/server";

const MWS_API_BASE = "https://tables.mws.ru/fusion/v1";

// Helper to get API key
function getApiKey(): string | null {
  return process.env.MWS_API_KEY || null;
}

// Helper to get datasheet ID
function getDatasheetId(): string | null {
  return process.env.NEXT_PUBLIC_WIKI_DATASHEET_ID || null;
}

// GET /api/wiki - List all wiki pages
export async function GET(request: Request) {
  const apiKey = getApiKey();
  const datasheetId = getDatasheetId();

  if (!apiKey) {
    return NextResponse.json(
      { error: "MWS_API_KEY not configured" },
      { status: 500 },
    );
  }

  if (!datasheetId) {
    return NextResponse.json(
      { error: "WIKI_DATASHEET_ID not configured" },
      { status: 500 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const viewId = searchParams.get("viewId") || "viw0Lfw3STnJg";

    const response = await fetch(
      `${MWS_API_BASE}/datasheets/${datasheetId}/records?viewId=${viewId}&fieldKey=name&pageSize=1000`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `MWS Tables error: ${error}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// POST /api/wiki - Create a new wiki page
export async function POST(request: Request) {
  const apiKey = getApiKey();
  const datasheetId = getDatasheetId();

  if (!apiKey) {
    return NextResponse.json(
      { error: "MWS_API_KEY not configured" },
      { status: 500 },
    );
  }

  if (!datasheetId) {
    return NextResponse.json(
      { error: "WIKI_DATASHEET_ID not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(
      `${MWS_API_BASE}/datasheets/${datasheetId}/records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: body.records,
          fieldKey: "name",
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `MWS Tables error: ${error}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// PATCH /api/wiki - Update wiki pages
export async function PATCH(request: Request) {
  const apiKey = getApiKey();
  const datasheetId = getDatasheetId();

  if (!apiKey) {
    return NextResponse.json(
      { error: "MWS_API_KEY not configured" },
      { status: 500 },
    );
  }

  if (!datasheetId) {
    return NextResponse.json(
      { error: "WIKI_DATASHEET_ID not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(
      `${MWS_API_BASE}/datasheets/${datasheetId}/records`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: body.records,
          fieldKey: "name",
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `MWS Tables error: ${error}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// DELETE /api/wiki - Delete wiki pages
export async function DELETE(request: Request) {
  const apiKey = getApiKey();
  const datasheetId = getDatasheetId();

  if (!apiKey) {
    return NextResponse.json(
      { error: "MWS_API_KEY not configured" },
      { status: 500 },
    );
  }

  if (!datasheetId) {
    return NextResponse.json(
      { error: "WIKI_DATASHEET_ID not configured" },
      { status: 500 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const recordIds = searchParams.getAll("recordIds");

    if (recordIds.length === 0) {
      return NextResponse.json(
        { error: "No recordIds provided" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${MWS_API_BASE}/datasheets/${datasheetId}/records?${recordIds.map((id) => `recordIds=${id}`).join("&")}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `MWS Tables error: ${error}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
