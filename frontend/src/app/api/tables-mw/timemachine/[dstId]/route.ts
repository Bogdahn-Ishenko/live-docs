import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";

interface Params {
  params: Promise<{ dstId: string }>;
}

/**
 * GET /api/tables-mw/timemachine/{dstId}
 * Get array of deleted record IDs
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { dstId } = await params;

  try {
    const data = await tablesMwApi.timemachine.getDeletedRecords(dstId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching timemachine data:", error);
    return NextResponse.json(
      { error: "Failed to fetch timemachine data" },
      { status: 500 }
    );
  }
}
