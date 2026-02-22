import { env } from "@/lib/env";

export async function extractTextFromImageFile(file: File): Promise<string | undefined> {
  if (env.ENABLE_OCR !== "true") {
    return undefined;
  }
  if (!file.type.startsWith("image/")) {
    return undefined;
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const tesseract = await import("tesseract.js");
    const result = await tesseract.recognize(bytes, "eng");
    const text = result?.data?.text?.trim();
    if (!text) return undefined;
    return text;
  } catch (error) {
    console.error("[ocr] image text extraction failed", error);
    return undefined;
  }
}

