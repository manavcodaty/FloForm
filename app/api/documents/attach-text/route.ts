import { NextRequest, NextResponse } from "next/server";
import { convexMutation } from "@/lib/convex-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  await convexMutation("klerki:attachDocumentText", {
    documentId: body.documentId,
    extractedText: body.extractedText
  });

  return NextResponse.json({ ok: true });
}
