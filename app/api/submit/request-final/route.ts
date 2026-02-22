import { NextRequest, NextResponse } from "next/server";
import { convexMutation } from "@/lib/convex-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await convexMutation("klerki:createApprovalTask", {
    applicationId: body.applicationId,
    kind: "final_submit",
    items: [],
    reason: "Final submission requires explicit user approval"
  });
  return NextResponse.json(result);
}
