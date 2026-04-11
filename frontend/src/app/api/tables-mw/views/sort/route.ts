import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";
import type { SortInfoRequest } from "@/fsd/shared/lib/tables-mw/api-types";

/**
 * POST /api/tables-mw/views/sort?spaceId={spaceId}&dstId={dstId}&viewId={viewId}
 * Set sort rules for a view
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
    const body = (await request.json()) as SortInfoRequest;
    const data = await tablesMwApi.views.setSort(spaceId, dstId, viewId, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error setting view sort:", error);
    return NextResponse.json(
      { error: "Failed to set view sort" },
      { status: 500 }
    );
  }
}
