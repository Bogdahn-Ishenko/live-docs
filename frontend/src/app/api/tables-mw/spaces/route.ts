import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";

/**
 * GET /api/tables-mw/spaces
 * Get all spaces for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const data = await tablesMwApi.spaces.getAll();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching spaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch spaces" },
      { status: 500 }
    );
  }
}
