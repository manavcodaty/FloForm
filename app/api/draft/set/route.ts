import { NextRequest, NextResponse } from "next/server";
import { convexMutation } from "@/lib/convex-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  await convexMutation("klerki:setDraftField", {
    applicationId: body.applicationId,
    fieldId: body.fieldId,
    value: body.value,
    confidence: body.confidence,
    evidence: body.evidence,
    updatedBy: body.updatedBy
  });

  return NextResponse.json({ ok: true });
}
