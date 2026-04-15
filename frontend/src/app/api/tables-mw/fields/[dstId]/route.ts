import { type NextRequest, NextResponse } from "next/server";
import { tablesMwApi } from "@/fsd/shared/lib/tables-mw/api-client";
import type { CreateFieldRequest } from "@/fsd/shared/lib/tables-mw/api-types";

interface Params {
  params: Promise<{ dstId: string }>;
}

/**
 * GET /api/tables-mw/fields/{dstId}?viewId={viewId}
 * Get all fields in a datasheet
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { dstId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const viewId = searchParams.get("viewId") || undefined;

  try {
    const data = await tablesMwApi.fields.getAll(dstId, viewId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch fields" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tables-mw/fields/{dstId}?spaceId={spaceId}
 * Create a new field in a datasheet
 */
export async function POST(request: NextRequest, { params }: Params) {
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
    const body = (await request.json()) as CreateFieldRequest;
    const data = await tablesMwApi.fields.create(spaceId, dstId, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating field:", error);
    return NextResponse.json(
      { error: "Failed to create field" },
      { status: 500 }
    );
  }
}
