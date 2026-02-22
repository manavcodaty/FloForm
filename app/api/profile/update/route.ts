import { NextRequest, NextResponse } from "next/server";
import { convexMutation } from "@/lib/convex-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  await convexMutation("klerki:saveExtractedProfile", {
    applicationId: body.applicationId,
    profile: body.profile
  });
  return NextResponse.json({ ok: true });
}
