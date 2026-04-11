import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";
import type { GroupRequest } from "@/fsd/shared/lib/tables-mw/api-types";

/**
 * POST /api/tables-mw/views/group?spaceId={spaceId}&dstId={dstId}&viewId={viewId}
 * Set group rules for a view
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
    const body = (await request.json()) as GroupRequest;
    const data = await tablesMwApi.views.setGroup(spaceId, dstId, viewId, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error setting view group:", error);
    return NextResponse.json(
      { error: "Failed to set view group" },
      { status: 500 }
    );
  }
}
