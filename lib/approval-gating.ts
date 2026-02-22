export const DEFAULT_APPROVAL_THRESHOLD = 0.75;

export function shouldRequireApproval(input: {
  confidence: number;
  sensitive?: boolean;
  threshold?: number;
}) {
  const threshold = input.threshold ?? DEFAULT_APPROVAL_THRESHOLD;
  if (input.sensitive) return true;
  return input.confidence < threshold;
}
