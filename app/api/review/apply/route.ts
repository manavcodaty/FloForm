import { NextRequest, NextResponse } from "next/server";
import { convexMutation } from "@/lib/convex-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await convexMutation("klerki:bulkSetDraftFields", {
    applicationId: body.applicationId,
    items: body.items
  });
  return NextResponse.json(result);
}
