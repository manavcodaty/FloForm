import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: number | string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function confidenceBand(confidence: number) {
  if (confidence >= 0.85) return "High";
  if (confidence >= 0.75) return "Medium";
  return "Low";
}

export function clampConfidence(confidence: number) {
  return Math.max(0, Math.min(1, confidence));
}

export function idFrom(parts: string[]) {
  return parts
    .join("_")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");
}
