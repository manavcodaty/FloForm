import { z } from "zod";

export const fieldEvidenceSchema = z.object({
  snippet: z.string().min(1),
  documentId: z.string().optional(),
  documentName: z.string().optional(),
  page: z.number().int().positive().optional(),
  lineRef: z.string().optional(),
  startOffset: z.number().int().nonnegative().optional(),
  endOffset: z.number().int().nonnegative().optional()
});

export const fieldValueSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  confidence: z.number().min(0).max(1),
  evidence: fieldEvidenceSchema,
  lastUpdatedBy: z.enum(["agent", "user"])
});

export const profileSectionSchema = z.record(z.string(), fieldValueSchema);

export const userProfileSchema = z.object({
  personal: profileSectionSchema,
  address: profileSectionSchema,
  education: profileSectionSchema,
  employment: profileSectionSchema,
  contact: profileSectionSchema,
  locks: z.record(z.string(), z.boolean()).default({})
});

export const formFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    "text",
    "email",
    "tel",
    "date",
    "number",
    "textarea",
    "select",
    "checkbox",
    "multiselect"
  ]),
  required: z.boolean().default(false),
  sensitive: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  section: z.string().min(1),
  step: z.number().int().min(1).max(5)
});

export const scholarshipFormSchema = z.object({
  id: z.literal("scholarship-application-v1"),
  title: z.literal("Scholarship Application"),
  description: z.string(),
  fields: z.array(formFieldSchema).min(20)
});

export const fieldMappingItemSchema = z.object({
  formFieldId: z.string(),
  profileFieldPath: z.string(),
  proposedValue: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  transformation: z.string().default("direct"),
  confidence: z.number().min(0).max(1),
  evidence: fieldEvidenceSchema,
  needsHuman: z.boolean().default(false),
  reason: z.string().optional()
});

export const fieldMappingPlanSchema = z.object({
  mappings: z.array(fieldMappingItemSchema),
  requiredHumanFields: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});

export const fillDraftSchema = z.object({
  fields: z.record(z.string(), fieldValueSchema),
  highlightedChanges: z.array(z.string()).default([]),
  status: z.enum(["draft", "needs_review", "ready_to_submit", "submitted"]).default("draft")
});

export const approvalTaskItemSchema = z.object({
  fieldId: z.string(),
  proposedValue: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  confidence: z.number().min(0).max(1),
  evidence: fieldEvidenceSchema,
  reason: z.string()
});

export const approvalTaskSchema = z.object({
  kind: z.enum(["flagged_field", "final_submit"]),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  items: z.array(approvalTaskItemSchema).default([]),
  reason: z.string(),
  decidedBy: z.string().optional(),
  decidedAt: z.number().optional()
});

export const auditEventSchema = z.object({
  timestamp: z.number(),
  eventType: z.string(),
  actor: z.enum(["agent", "user", "system"]),
  payload: z.record(z.string(), z.any())
});

export const applicationStatusSchema = z.enum([
  "draft",
  "needs_review",
  "ready_to_submit",
  "submitted"
]);

export type UserProfile = z.infer<typeof userProfileSchema>;
export type ScholarshipFormSchema = z.infer<typeof scholarshipFormSchema>;
export type FieldMappingPlan = z.infer<typeof fieldMappingPlanSchema>;
export type FillDraft = z.infer<typeof fillDraftSchema>;
export type ApprovalTask = z.infer<typeof approvalTaskSchema>;
