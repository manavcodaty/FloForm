import { NextRequest, NextResponse } from "next/server";
import { convexMutation } from "@/lib/convex-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await convexMutation("klerki:saveDocument", {
    applicationId: body.applicationId,
    storageId: `text-${Date.now()}`,
    filename: body.filename ?? "pasted-text.txt",
    mimeType: "text/plain",
    extractedText: body.text
  });
  return NextResponse.json(result);
}
