import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";

/**
 * GET /api/tables-mw/nodes?spaceId={spaceId}&type={type}
 * Get nodes in a space
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const spaceId = searchParams.get("spaceId");
  const typeParam = searchParams.get("type");

  if (!spaceId) {
    return NextResponse.json(
      { error: "Missing spaceId parameter" },
      { status: 400 }
    );
  }

  const type = typeParam ? parseInt(typeParam, 10) : undefined;

  try {
    const data = await tablesMwApi.nodes.getBySpace(spaceId, type);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching nodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch nodes" },
      { status: 500 }
    );
  }
}
