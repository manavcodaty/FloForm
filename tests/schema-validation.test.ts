import { describe, expect, it } from "vitest";
import { fieldMappingPlanSchema, userProfileSchema } from "../lib/schemas";

describe("schema validation", () => {
  it("validates profile confidence range", () => {
    const valid = userProfileSchema.safeParse({
      personal: {
        first_name: {
          value: "Ava",
          confidence: 0.9,
          evidence: { snippet: "Ava" },
          lastUpdatedBy: "agent"
        }
      },
      address: {},
      education: {},
      employment: {},
      contact: {},
      locks: {}
    });

    expect(valid.success).toBe(true);

    const invalid = userProfileSchema.safeParse({
      personal: {
        first_name: {
          value: "Ava",
          confidence: 1.5,
          evidence: { snippet: "Ava" },
          lastUpdatedBy: "agent"
        }
      },
      address: {},
      education: {},
      employment: {},
      contact: {},
      locks: {}
    });

    expect(invalid.success).toBe(false);
  });

  it("requires mapping evidence and confidence", () => {
    const parsed = fieldMappingPlanSchema.safeParse({
      mappings: [
        {
          formFieldId: "personal_first_name",
          profileFieldPath: "personal.first_name",
          proposedValue: "Ava",
          transformation: "direct",
          confidence: 0.82,
          evidence: { snippet: "Ava" },
          needsHuman: false
        }
      ],
      requiredHumanFields: [],
      notes: []
    });

    expect(parsed.success).toBe(true);
  });
});
