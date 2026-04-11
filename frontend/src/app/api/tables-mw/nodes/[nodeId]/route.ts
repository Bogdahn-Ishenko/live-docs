import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";

interface Params {
  params: Promise<{ nodeId: string }>;
}

/**
 * GET /api/tables-mw/nodes/{nodeId}
 * Get detailed information about a node
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { nodeId } = await params;

  try {
    const data = await tablesMwApi.nodes.getDetails(nodeId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching node details:", error);
    return NextResponse.json(
      { error: "Failed to fetch node details" },
      { status: 500 }
    );
  }
}
