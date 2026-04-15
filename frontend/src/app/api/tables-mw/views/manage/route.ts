import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";
import type {
  CreateViewRequestBody,
  UpdateViewNameRequest,
} from "@/fsd/shared/lib/tables-mw/api-types";

/**
 * POST /api/tables-mw/views/manage?spaceId={spaceId}&dstId={dstId}
 * Create a new view in a datasheet
 */
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const spaceId = searchParams.get("spaceId");
  const dstId = searchParams.get("dstId");

  if (!spaceId || !dstId) {
    return NextResponse.json(
      { error: "Missing spaceId or dstId parameter" },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as CreateViewRequestBody;
    const data = await tablesMwApi.views.create(spaceId, dstId, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating view:", error);
    return NextResponse.json(
      { error: "Failed to create view" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tables-mw/views/manage?spaceId={spaceId}&dstId={dstId}&viewId={viewId}
 * Update view name
 */
export async function PUT(request: NextRequest) {
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
    const body = (await request.json()) as UpdateViewNameRequest;
    const data = await tablesMwApi.views.updateName(spaceId, dstId, viewId, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating view name:", error);
    return NextResponse.json(
      { error: "Failed to update view name" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tables-mw/views/manage?spaceId={spaceId}&dstId={dstId}&viewId={viewId}
 * Delete a view
 */
export async function DELETE(request: NextRequest) {
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
    const data = await tablesMwApi.views.delete(spaceId, dstId, viewId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting view:", error);
    return NextResponse.json(
      { error: "Failed to delete view" },
      { status: 500 }
    );
  }
}
