import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";
import type { MoveViewRequest } from "@/fsd/shared/lib/tables-mw/api-types";

/**
 * POST /api/tables-mw/views/move?spaceId={spaceId}&dstId={dstId}&viewId={viewId}
 * Move view to a new index
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
    const body = (await request.json()) as MoveViewRequest;
    const data = await tablesMwApi.views.move(spaceId, dstId, viewId, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error moving view:", error);
    return NextResponse.json(
      { error: "Failed to move view" },
      { status: 500 }
    );
  }
}
