import { Badge } from "@/components/ui/badge";
import { confidenceBand } from "@/lib/utils";

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const band = confidenceBand(confidence);
  if (band === "High") return <Badge variant="success">High ({Math.round(confidence * 100)}%)</Badge>;
  if (band === "Medium") return <Badge variant="warning">Med ({Math.round(confidence * 100)}%)</Badge>;
  return <Badge variant="danger">Low ({Math.round(confidence * 100)}%)</Badge>;
}
