import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";
import type { CreateDatasheetRequest } from "@/fsd/shared/lib/tables-mw/api-types";

/**
 * POST /api/tables-mw/datasheets?spaceId={spaceId}
 * Create a new datasheet in a space
 */
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const spaceId = searchParams.get("spaceId");

  if (!spaceId) {
    return NextResponse.json(
      { error: "Missing spaceId parameter" },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as CreateDatasheetRequest;
    const data = await tablesMwApi.datasheets.create(spaceId, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating datasheet:", error);
    return NextResponse.json(
      { error: "Failed to create datasheet" },
      { status: 500 }
    );
  }
}
