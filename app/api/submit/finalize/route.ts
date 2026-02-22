import { NextRequest, NextResponse } from "next/server";
import { convexMutation } from "@/lib/convex-server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const result = await convexMutation("klerki:finalizeSubmission", {
    applicationId: body.applicationId
  });

  return NextResponse.json(result);
}
