import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";

/**
 * DELETE /api/tables-mw/fields/delete?spaceId={spaceId}&dstId={dstId}&fieldId={fieldId}
 * Delete a field from a datasheet
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const spaceId = searchParams.get("spaceId");
  const dstId = searchParams.get("dstId");
  const fieldId = searchParams.get("fieldId");

  if (!spaceId || !dstId || !fieldId) {
    return NextResponse.json(
      { error: "Missing spaceId, dstId, or fieldId parameter" },
      { status: 400 }
    );
  }

  try {
    const data = await tablesMwApi.fields.delete(spaceId, dstId, fieldId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting field:", error);
    return NextResponse.json(
      { error: "Failed to delete field" },
      { status: 500 }
    );
  }
}
