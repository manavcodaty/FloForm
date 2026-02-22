import { describe, expect, it } from "vitest";
import { shouldRequireApproval } from "../lib/approval-gating";

describe("approval gating", () => {
  it("requires approval for low confidence", () => {
    expect(shouldRequireApproval({ confidence: 0.74 })).toBe(true);
    expect(shouldRequireApproval({ confidence: 0.75 })).toBe(false);
  });

  it("requires approval for sensitive fields", () => {
    expect(shouldRequireApproval({ confidence: 0.99, sensitive: true })).toBe(true);
  });
});
