import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse/lib/pdf-parse.js";

export const runtime = "nodejs";

function isPdfUpload(file: File) {
  if (file.type.toLowerCase().includes("pdf")) return true;
  return file.name.toLowerCase().endsWith(".pdf");
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!isPdfUpload(file)) {
    return NextResponse.json({ text: "", warning: "Only PDF extraction enabled in MVP." });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await pdf(buffer);
    return NextResponse.json({ text: parsed.text ?? "" });
  } catch (error) {
    console.error("[extract-text] failed to parse PDF", {
      name: file.name,
      type: file.type,
      size: file.size,
      error
    });
    return NextResponse.json({
      text: "",
      warning: "Could not extract text from this PDF. You can continue using fallback text paste."
    });
  }
}
