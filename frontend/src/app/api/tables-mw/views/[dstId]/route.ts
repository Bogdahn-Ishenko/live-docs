import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";

interface Params {
  params: Promise<{ dstId: string }>;
}

/**
 * GET /api/tables-mw/views/{dstId}
 * Get all views in a datasheet
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { dstId } = await params;

  try {
    const data = await tablesMwApi.views.getAll(dstId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching views:", error);
    return NextResponse.json(
      { error: "Failed to fetch views" },
      { status: 500 }
    );
  }
}
