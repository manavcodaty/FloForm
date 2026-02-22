import { NextRequest, NextResponse } from "next/server";
import { getAuthedConvexClient, convexMutation } from "@/lib/convex-server";
import { extractTextFromImageFile } from "@/lib/ocr";

export const runtime = "nodejs";

function resolveMimeType(file: File) {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

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
  uploadForm.append("file", file, file.name);

  const uploadResponse = await fetch(uploadUrl as string, {
    method: "POST",
    body: uploadForm
  });

  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text().catch(() => "");
    return NextResponse.json(
      { error: "Failed to upload file", detail: detail.slice(0, 400) },
      { status: 500 }
    );
  }

  const { storageId } = await uploadResponse.json();

  const extractedText = await extractTextFromImageFile(file);
  const mimeType = resolveMimeType(file);

  const result = await convexMutation("klerki:saveDocument", {
    applicationId,
    storageId,
    filename: file.name,
    mimeType,
    size: file.size,
    extractedText
  }) as { documentId: string };

  return NextResponse.json({ storageId, documentId: result.documentId, extractedText });
}
