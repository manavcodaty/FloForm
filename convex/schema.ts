import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_clerk_user_id", ["clerkUserId"]),

  applications: defineTable({
    userId: v.string(),
    title: v.string(),
    formType: v.string(),
    formSchemaId: v.optional(v.id("formSchemas")),
    status: v.union(
      v.literal("draft"),
      v.literal("needs_review"),
      v.literal("ready_to_submit"),
      v.literal("submitted")
    ),
    progress: v.number(),
    submittedAt: v.optional(v.number()),
    submittedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_user", ["userId"]),

  documents: defineTable({
    applicationId: v.id("applications"),
    userId: v.string(),
    storageId: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    size: v.optional(v.number()),
    uploadedAt: v.number(),
    extractedText: v.optional(v.string()),
    sourceType: v.union(v.literal("pdf"), v.literal("image"), v.literal("text"))
  })
    .index("by_application", ["applicationId"])
    .index("by_user", ["userId"]),

  profiles: defineTable({
    applicationId: v.id("applications"),
    userId: v.string(),
    profile: v.any(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_application", ["applicationId"])
    .index("by_user", ["userId"]),

  formSchemas: defineTable({
    formType: v.string(),
    version: v.string(),
    schema: v.any(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_form_type", ["formType"]),

  fieldMappings: defineTable({
    applicationId: v.id("applications"),
    userId: v.string(),
    mappingPlan: v.any(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_application", ["applicationId"])
    .index("by_user", ["userId"]),

  fillDrafts: defineTable({
    applicationId: v.id("applications"),
    userId: v.string(),
    draft: v.any(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_application", ["applicationId"])
    .index("by_user", ["userId"]),

  approvalTasks: defineTable({
    applicationId: v.id("applications"),
    userId: v.string(),
    kind: v.union(v.literal("flagged_field"), v.literal("final_submit")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    items: v.array(v.any()),
    reason: v.string(),
    decision: v.optional(v.union(v.literal("approve"), v.literal("reject"))),
    edits: v.optional(v.any()),
    createdBy: v.string(),
    createdAt: v.number(),
    decidedBy: v.optional(v.string()),
    decidedAt: v.optional(v.number())
  })
    .index("by_application", ["applicationId"])
    .index("by_status", ["status"]),

  runStateSnapshots: defineTable({
    applicationId: v.id("applications"),
    userId: v.string(),
    runId: v.string(),
    stateJson: v.string(),
    interruptions: v.array(v.any()),
    status: v.union(v.literal("active"), v.literal("resolved"), v.literal("error")),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_application", ["applicationId"])
    .index("by_run", ["runId"]),

  auditEvents: defineTable({
    applicationId: v.id("applications"),
    userId: v.string(),
    timestamp: v.number(),
    eventType: v.string(),
    actor: v.union(v.literal("agent"), v.literal("user"), v.literal("system")),
    payload: v.any()
  })
    .index("by_application", ["applicationId"])
    .index("by_timestamp", ["timestamp"])
});
