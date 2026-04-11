import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";
import type { HideFieldsRequest } from "@/fsd/shared/lib/tables-mw/api-types";

/**
 * POST /api/tables-mw/views/hidden?spaceId={spaceId}&dstId={dstId}&viewId={viewId}
 * Set hidden fields for a view
 */
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const spaceId = searchParams.get("spaceId");
  const dstId = searchParams.get("dstId");
  const viewId = searchParams.get("viewId");

  if (!spaceId || !dstId || !viewId) {
    return NextResponse.json(
      { error: "Missing spaceId, dstId, or viewId parameter" },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as HideFieldsRequest;
    const data = await tablesMwApi.views.setHiddenFields(spaceId, dstId, viewId, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error setting hidden fields:", error);
    return NextResponse.json(
      { error: "Failed to set hidden fields" },
      { status: 500 }
    );
  }
}
