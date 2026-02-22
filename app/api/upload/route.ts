import { NextRequest, NextResponse } from "next/server";
import { getAuthedConvexClient, convexMutation } from "@/lib/convex-server";
import { extractTextFromImageFile } from "@/lib/ocr";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const applicationId = formData.get("applicationId") as string | null;

  if (!file || !applicationId) {
    return NextResponse.json({ error: "file and applicationId are required" }, { status: 400 });
  }

  const client = await getAuthedConvexClient();
  const uploadUrl = await client.mutation("klerki:generateUploadUrl" as any, {});

  const uploadForm = new FormData();
  uploadForm.append("file", file);

  const uploadResponse = await fetch(uploadUrl as string, {
    method: "POST",
    body: uploadForm
  });

  if (!uploadResponse.ok) {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }

  const { storageId } = await uploadResponse.json();

  const extractedText = await extractTextFromImageFile(file);

  const result = await convexMutation("klerki:saveDocument", {
    applicationId,
    storageId,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    extractedText
  }) as { documentId: string };

  return NextResponse.json({ storageId, documentId: result.documentId, extractedText });
}
