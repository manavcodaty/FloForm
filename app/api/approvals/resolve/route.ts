import { NextRequest, NextResponse } from "next/server";
import { convexMutation } from "@/lib/convex-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await convexMutation("klerki:resolveApprovalTask", {
    taskId: body.taskId,
    decision: body.decision,
    edits: body.edits
  });
  return NextResponse.json(result);
}
