import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";

/**
 * DELETE /api/tables-mw/nodes/delete?spaceId={spaceId}&nodeId={nodeId}
 * Delete a node (move to trash or permanent delete)
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const spaceId = searchParams.get("spaceId");
  const nodeId = searchParams.get("nodeId");

  if (!spaceId || !nodeId) {
    return NextResponse.json(
      { error: "Missing spaceId or nodeId parameter" },
      { status: 400 }
    );
  }

  try {
    const data = await tablesMwApi.nodes.delete(spaceId, nodeId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting node:", error);
    return NextResponse.json(
      { error: "Failed to delete node" },
      { status: 500 }
    );
  }
}
