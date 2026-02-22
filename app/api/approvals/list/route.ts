import { NextRequest, NextResponse } from "next/server";
import { convexQuery } from "@/lib/convex-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const applicationId = searchParams.get("applicationId");
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  }
  const tasks = await convexQuery("klerki:listApprovalTasks", { applicationId });
  return NextResponse.json({ tasks });
}
