import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse/lib/pdf-parse.js";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!file.type.includes("pdf")) {
    return NextResponse.json({ text: "", warning: "Only PDF extraction enabled in MVP." });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const parsed = await pdf(buffer);

  return NextResponse.json({ text: parsed.text ?? "" });
}
