import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";

interface Params {
  params: Promise<{ dstId: string }>;
}

/**
 * DELETE /api/tables-mw/datasheets/{dstId}?spaceId={spaceId}
 * Delete a datasheet
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { dstId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const spaceId = searchParams.get("spaceId");

  if (!spaceId) {
    return NextResponse.json(
      { error: "Missing spaceId parameter" },
      { status: 400 }
    );
  }

  try {
    const data = await tablesMwApi.datasheets.delete(spaceId, dstId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting datasheet:", error);
    return NextResponse.json(
      { error: "Failed to delete datasheet" },
      { status: 500 }
    );
  }
}
