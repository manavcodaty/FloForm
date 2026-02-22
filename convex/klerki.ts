import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fieldMappingPlanSchema, fillDraftSchema, scholarshipFormSchema, userProfileSchema } from "../lib/schemas";
import { SCHOLARSHIP_FORM_SCHEMA } from "../lib/form-schema";

const CONFIDENCE_THRESHOLD = 0.75;

function identityToUserId(identity: any) {
  return identity?.subject ?? identity?.tokenIdentifier ?? identity?.issuer;
}

async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<any> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized");
  }
  const userId = identityToUserId(identity);
  if (!userId) {
    throw new ConvexError("Invalid identity");
  }
  return { identity, userId };
}

async function assertApplicationOwner(ctx: any, applicationId: any) {
  const { userId } = await requireAuth(ctx);
  const application = await ctx.db.get(applicationId);
  if (!application) {
    throw new ConvexError("Application not found");
  }
  if (application.userId !== userId) {
    throw new ConvexError("Forbidden");
  }
  return { application, userId };
}

async function appendAuditEvent(ctx: any, args: {
  applicationId: any;
  userId: string;
  actor: "agent" | "user" | "system";
  eventType: string;
  payload: Record<string, any>;
}) {
  await ctx.db.insert("auditEvents", {
    applicationId: args.applicationId,
    userId: args.userId,
    timestamp: Date.now(),
    actor: args.actor,
    eventType: args.eventType,
    payload: args.payload
  });
}

async function ensureFormSchema(ctx: any, formType: string) {
  const existing = await ctx.db
    .query("formSchemas")
    .withIndex("by_form_type", (q: any) => q.eq("formType", formType))
    .first();

  if (existing) {
    return existing._id;
  }

  scholarshipFormSchema.parse(SCHOLARSHIP_FORM_SCHEMA);
  return ctx.db.insert("formSchemas", {
    formType,
    version: "v1",
    schema: SCHOLARSHIP_FORM_SCHEMA,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

async function getOrCreateDraft(ctx: any, applicationId: any, userId: string) {
  const existing = await ctx.db
    .query("fillDrafts")
    .withIndex("by_application", (q: any) => q.eq("applicationId", applicationId))
    .first();

  if (existing) {
    return existing;
  }

  const baseDraft = fillDraftSchema.parse({
    fields: {},
    highlightedChanges: [],
    status: "draft"
  });

  const _id = await ctx.db.insert("fillDrafts", {
    applicationId,
    userId,
    draft: baseDraft,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  return { _id, applicationId, userId, draft: baseDraft };
}

async function getFormSchemaForApplication(ctx: any, application: any) {
  if (application.formSchemaId) {
    const schema = await ctx.db.get(application.formSchemaId);
    if (schema) return schema.schema;
  }
  return SCHOLARSHIP_FORM_SCHEMA;
}

function buildSourceType(mimeType: string, extractedText?: string) {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (extractedText) return "text";
  return "text";
}

export const createApplication = mutation({
  args: {
    title: v.string(),
    formType: v.string()
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const now = Date.now();

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!existingUser) {
      await ctx.db.insert("users", {
        clerkUserId: userId,
        createdAt: now,
        updatedAt: now
      });
    }

    const formSchemaId = await ensureFormSchema(ctx, args.formType);

    const applicationId = await ctx.db.insert("applications", {
      userId,
      title: args.title,
      formType: args.formType,
      formSchemaId,
      status: "draft",
      progress: 0,
      createdAt: now,
      updatedAt: now
    });

    await appendAuditEvent(ctx, {
      applicationId,
      userId,
      actor: "system",
      eventType: "run_started",
      payload: { title: args.title, formType: args.formType }
    });

    return { applicationId };
  }
});

export const saveDocument = mutation({
  args: {
    applicationId: v.id("applications"),
    storageId: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    size: v.optional(v.number()),
    extractedText: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { userId } = await assertApplicationOwner(ctx, args.applicationId);

    const documentId = await ctx.db.insert("documents", {
      applicationId: args.applicationId,
      userId,
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      extractedText: args.extractedText,
      sourceType: buildSourceType(args.mimeType, args.extractedText) as "pdf" | "image" | "text",
      uploadedAt: Date.now()
    });

    await appendAuditEvent(ctx, {
      applicationId: args.applicationId,
      userId,
      actor: "user",
      eventType: "document_saved",
      payload: { documentId, filename: args.filename, mimeType: args.mimeType }
    });

    return { documentId };
  }
});

export const saveDocuments = mutation({
  args: {
    applicationId: v.id("applications"),
    items: v.array(
      v.object({
        storageId: v.string(),
        filename: v.string(),
        mimeType: v.string(),
        size: v.optional(v.number()),
        extractedText: v.optional(v.string())
      })
    )
  },
  handler: async (ctx, args) => {
    const { userId } = await assertApplicationOwner(ctx, args.applicationId);
    const saved = [];
    for (const item of args.items) {
      const documentId = await ctx.db.insert("documents", {
        applicationId: args.applicationId,
        userId,
        storageId: item.storageId,
        filename: item.filename,
        mimeType: item.mimeType,
        size: item.size,
        extractedText: item.extractedText,
        sourceType: buildSourceType(item.mimeType, item.extractedText) as "pdf" | "image" | "text",
        uploadedAt: Date.now()
      });
      saved.push(documentId);
    }
    return { documentIds: saved };
  }
});

export const saveExtractedProfile = mutation({
  args: {
    applicationId: v.id("applications"),
    profile: v.any()
  },
  handler: async (ctx, args) => {
    const { userId } = await assertApplicationOwner(ctx, args.applicationId);
    const validated = userProfileSchema.parse(args.profile);

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        profile: validated,
        updatedAt: Date.now()
      });
    } else {
      await ctx.db.insert("profiles", {
        applicationId: args.applicationId,
        userId,
        profile: validated,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    await appendAuditEvent(ctx, {
      applicationId: args.applicationId,
      userId,
      actor: "agent",
      eventType: "extraction_completed",
      payload: { sectionCount: Object.keys(validated).length }
    });

    return { ok: true };
  }
});

export const saveMappingPlan = mutation({
  args: {
    applicationId: v.id("applications"),
    mappingPlan: v.any()
  },
  handler: async (ctx, args) => {
    const { userId } = await assertApplicationOwner(ctx, args.applicationId);
    const validated = fieldMappingPlanSchema.parse(args.mappingPlan);

    const existing = await ctx.db
      .query("fieldMappings")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        mappingPlan: validated,
        updatedAt: Date.now()
      });
    } else {
      await ctx.db.insert("fieldMappings", {
        applicationId: args.applicationId,
        userId,
        mappingPlan: validated,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    await appendAuditEvent(ctx, {
      applicationId: args.applicationId,
      userId,
      actor: "agent",
      eventType: "mapping_completed",
      payload: {
        mappingCount: validated.mappings.length,
        requiredHumanFields: validated.requiredHumanFields
      }
    });

    return { ok: true };
  }
});

export const saveFillDraft = mutation({
  args: {
    applicationId: v.id("applications"),
    draft: v.any()
  },
  handler: async (ctx, args) => {
    const { userId } = await assertApplicationOwner(ctx, args.applicationId);
    const validated = fillDraftSchema.parse(args.draft);

    const existing = await ctx.db
      .query("fillDrafts")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        draft: validated,
        updatedAt: Date.now()
      });
    } else {
      await ctx.db.insert("fillDrafts", {
        applicationId: args.applicationId,
        userId,
        draft: validated,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    await appendAuditEvent(ctx, {
      applicationId: args.applicationId,
      userId,
      actor: "agent",
      eventType: "draft_saved",
      payload: { fieldCount: Object.keys(validated.fields).length }
    });

    return { ok: true };
  }
});

export const setDraftField = mutation({
  args: {
    applicationId: v.id("applications"),
    fieldId: v.string(),
    value: v.union(v.string(), v.number(), v.boolean(), v.null()),
    confidence: v.number(),
    evidence: v.any(),
    updatedBy: v.union(v.literal("agent"), v.literal("user"))
  },
  handler: async (ctx, args) => {
    const { userId } = await assertApplicationOwner(ctx, args.applicationId);
    const draftDoc = await getOrCreateDraft(ctx, args.applicationId, userId);

    const updatedDraft = {
      ...draftDoc.draft,
      fields: {
        ...draftDoc.draft.fields,
        [args.fieldId]: {
          value: args.value,
          confidence: args.confidence,
          evidence: args.evidence,
          lastUpdatedBy: args.updatedBy
        }
      },
      highlightedChanges: Array.from(new Set([...(draftDoc.draft.highlightedChanges ?? []), args.fieldId]))
    };

    const parsed = fillDraftSchema.parse(updatedDraft);

    await ctx.db.patch(draftDoc._id, {
      draft: parsed,
      updatedAt: Date.now()
    });

    await ctx.db.patch(args.applicationId, {
      status: args.confidence < CONFIDENCE_THRESHOLD ? "needs_review" : "draft",
      updatedAt: Date.now()
    });

    await appendAuditEvent(ctx, {
      applicationId: args.applicationId,
      userId,
      actor: args.updatedBy === "agent" ? "agent" : "user",
      eventType: "field_set",
      payload: { fieldId: args.fieldId, confidence: args.confidence }
    });

    return { ok: true };
  }
});

export const setFieldValue = setDraftField;

export const bulkSetDraftFields = mutation({
  args: {
    applicationId: v.id("applications"),
    items: v.array(
      v.object({
        fieldId: v.string(),
        value: v.union(v.string(), v.number(), v.boolean(), v.null()),
        confidence: v.number(),
        evidence: v.any(),
        updatedBy: v.optional(v.union(v.literal("agent"), v.literal("user")))
      })
    )
  },
  handler: async (ctx, args) => {
    const { application, userId } = await assertApplicationOwner(ctx, args.applicationId);
    const formSchema = await getFormSchemaForApplication(ctx, application);
    const fieldIndex = new Map(formSchema.fields.map((f: any) => [f.id, f]));

    const draftDoc = await getOrCreateDraft(ctx, args.applicationId, userId);
    const flaggedItems: any[] = [];
    const nextFields = { ...draftDoc.draft.fields };

    for (const item of args.items) {
      const meta = fieldIndex.get(item.fieldId) as { sensitive?: boolean } | undefined;
      const sensitive = Boolean(meta?.sensitive);
      const lowConfidence = item.confidence < CONFIDENCE_THRESHOLD;
      if (lowConfidence || sensitive) {
        flaggedItems.push({
          fieldId: item.fieldId,
          proposedValue: item.value,
          confidence: item.confidence,
          evidence: item.evidence,
          reason: sensitive
            ? "Sensitive field requires explicit approval"
            : `Confidence below threshold (${CONFIDENCE_THRESHOLD})`
        });
        continue;
      }
      nextFields[item.fieldId] = {
        value: item.value,
        confidence: item.confidence,
        evidence: item.evidence,
        lastUpdatedBy: item.updatedBy ?? "agent"
      };
    }

    const nextDraft = fillDraftSchema.parse({
      ...draftDoc.draft,
      fields: nextFields,
      highlightedChanges: Array.from(
        new Set([
          ...(draftDoc.draft.highlightedChanges ?? []),
          ...args.items.filter((item) => !flaggedItems.find((f) => f.fieldId === item.fieldId)).map((item) => item.fieldId)
        ])
      ),
      status: flaggedItems.length > 0 ? "needs_review" : "draft"
    });

    await ctx.db.patch(draftDoc._id, {
      draft: nextDraft,
      updatedAt: Date.now()
    });

    let approvalTaskId: any = null;
    if (flaggedItems.length > 0) {
      approvalTaskId = await ctx.db.insert("approvalTasks", {
        applicationId: args.applicationId,
        userId,
        kind: "flagged_field",
        status: "pending",
        items: flaggedItems,
        reason: "Low-confidence or sensitive fields require user approval",
        createdBy: "agent",
        createdAt: Date.now()
      });

      await ctx.db.patch(args.applicationId, {
        status: "needs_review",
        updatedAt: Date.now()
      });
    }

    await appendAuditEvent(ctx, {
      applicationId: args.applicationId,
      userId,
      actor: "agent",
      eventType: "bulk_fill_attempted",
      payload: {
        appliedCount: args.items.length - flaggedItems.length,
        flaggedCount: flaggedItems.length,
        approvalTaskId
      }
    });

    return {
      appliedCount: args.items.length - flaggedItems.length,
      flaggedCount: flaggedItems.length,
      approvalTaskId
    };
  }
});

export const bulkSetFields = bulkSetDraftFields;

export const createApprovalTask = mutation({
  args: {
    applicationId: v.id("applications"),
    kind: v.union(v.literal("flagged_field"), v.literal("final_submit")),
    items: v.array(v.any()),
    reason: v.string()
  },
  handler: async (ctx, args) => {
    const { userId } = await assertApplicationOwner(ctx, args.applicationId);

    const taskId = await ctx.db.insert("approvalTasks", {
      applicationId: args.applicationId,
      userId,
      kind: args.kind,
      status: "pending",
      items: args.items,
      reason: args.reason,
      createdBy: "agent",
      createdAt: Date.now()
    });

    await appendAuditEvent(ctx, {
      applicationId: args.applicationId,
      userId,
      actor: "agent",
      eventType: "approval_requested",
      payload: { taskId, kind: args.kind, reason: args.reason }
    });

    return { taskId };
  }
});

export const resolveApprovalTask = mutation({
  args: {
    taskId: v.id("approvalTasks"),
    decision: v.union(v.literal("approve"), v.literal("reject")),
    edits: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new ConvexError("Task not found");
    }
    if (task.userId !== userId) {
      throw new ConvexError("Forbidden");
    }

    const nextStatus = args.decision === "approve" ? "approved" : "rejected";
    await ctx.db.patch(args.taskId, {
      status: nextStatus,
      decision: args.decision,
      edits: args.edits,
      decidedBy: userId,
      decidedAt: Date.now()
    });

    if (task.kind === "flagged_field" && args.decision === "approve") {
      const draftDoc = await getOrCreateDraft(ctx, task.applicationId, userId);
      const nextFields = { ...draftDoc.draft.fields };
      for (const item of task.items) {
        const overrideValue = args.edits?.[item.fieldId] ?? item.proposedValue;
        nextFields[item.fieldId] = {
          value: overrideValue,
          confidence: Math.max(item.confidence, CONFIDENCE_THRESHOLD),
          evidence: item.evidence,
          lastUpdatedBy: "user"
        };
      }
      const nextDraft = fillDraftSchema.parse({
        ...draftDoc.draft,
        fields: nextFields,
        status: "ready_to_submit"
      });
      await ctx.db.patch(draftDoc._id, {
        draft: nextDraft,
        updatedAt: Date.now()
      });
      await ctx.db.patch(task.applicationId, {
        status: "ready_to_submit",
        progress: 90,
        updatedAt: Date.now()
      });
    }

    await appendAuditEvent(ctx, {
      applicationId: task.applicationId,
      userId,
      actor: "user",
      eventType: args.decision === "approve" ? "approval_approved" : "approval_rejected",
      payload: { taskId: args.taskId, kind: task.kind, edits: args.edits }
    });

    return { ok: true };
  }
});

export const finalizeSubmission = mutation({
  args: {
    applicationId: v.id("applications")
  },
  handler: async (ctx, args) => {
    const { userId } = await assertApplicationOwner(ctx, args.applicationId);

    const finalApproval = await ctx.db
      .query("approvalTasks")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("kind"), "final_submit"),
          q.eq(q.field("status"), "approved")
        )
      )
      .first();

    if (!finalApproval) {
      throw new ConvexError("Final submit approval is required before submission");
    }

    await ctx.db.patch(args.applicationId, {
      status: "submitted",
      progress: 100,
      submittedAt: Date.now(),
      submittedBy: userId,
      updatedAt: Date.now()
    });

    const draftDoc = await ctx.db
      .query("fillDrafts")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();

    if (draftDoc) {
      const nextDraft = fillDraftSchema.parse({
        ...draftDoc.draft,
        status: "submitted"
      });
      await ctx.db.patch(draftDoc._id, {
        draft: nextDraft,
        updatedAt: Date.now()
      });
    }

    await appendAuditEvent(ctx, {
      applicationId: args.applicationId,
      userId,
      actor: "system",
      eventType: "submission_approved",
      payload: { finalApprovalTaskId: finalApproval._id }
    });

    return { ok: true };
  }
});

export const getApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    await assertApplicationOwner(ctx, args.applicationId);
    return ctx.db.get(args.applicationId);
  }
});

export const listApplications = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return ctx.db
      .query("applications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  }
});

export const getDocuments = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    await assertApplicationOwner(ctx, args.applicationId);
    return ctx.db
      .query("documents")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .collect();
  }
});

export const getProfile = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    await assertApplicationOwner(ctx, args.applicationId);
    return ctx.db
      .query("profiles")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();
  }
});

export const getMappingPlan = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    await assertApplicationOwner(ctx, args.applicationId);
    return ctx.db
      .query("fieldMappings")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();
  }
});

export const getFillDraft = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    await assertApplicationOwner(ctx, args.applicationId);
    return ctx.db
      .query("fillDrafts")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();
  }
});

export const getDraft = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    await assertApplicationOwner(ctx, args.applicationId);
    return ctx.db
      .query("fillDrafts")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();
  }
});

export const listApprovalTasks = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    await assertApplicationOwner(ctx, args.applicationId);
    return ctx.db
      .query("approvalTasks")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .order("desc")
      .collect();
  }
});

export const listAuditEvents = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    await assertApplicationOwner(ctx, args.applicationId);
    return ctx.db
      .query("auditEvents")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .order("desc")
      .collect();
  }
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return ctx.storage.generateUploadUrl();
  }
});

export const saveRunStateSnapshot = mutation({
  args: {
    applicationId: v.id("applications"),
    runId: v.string(),
    stateJson: v.string(),
    interruptions: v.array(v.any()),
    status: v.optional(v.union(v.literal("active"), v.literal("resolved"), v.literal("error")))
  },
  handler: async (ctx, args) => {
    const { userId } = await assertApplicationOwner(ctx, args.applicationId);

    const existing = await ctx.db
      .query("runStateSnapshots")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stateJson: args.stateJson,
        interruptions: args.interruptions,
        status: args.status ?? existing.status,
        updatedAt: Date.now()
      });
      return { snapshotId: existing._id };
    }

    const snapshotId = await ctx.db.insert("runStateSnapshots", {
      applicationId: args.applicationId,
      userId,
      runId: args.runId,
      stateJson: args.stateJson,
      interruptions: args.interruptions,
      status: args.status ?? "active",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    return { snapshotId };
  }
});

export const getRunStateSnapshot = query({
  args: {
    runId: v.string()
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const snapshot = await ctx.db
      .query("runStateSnapshots")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .first();
    if (!snapshot) return null;
    if (snapshot.userId !== userId) {
      throw new ConvexError("Forbidden");
    }
    return snapshot;
  }
});

export const listRunStateSnapshots = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return ctx.db
      .query("runStateSnapshots")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .collect();
  }
});

export const getFormSchema = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const { application } = await assertApplicationOwner(ctx, args.applicationId);
    return getFormSchemaForApplication(ctx, application);
  }
});

export const logAuditEvent = mutation({
  args: {
    applicationId: v.id("applications"),
    eventType: v.string(),
    actor: v.union(v.literal("agent"), v.literal("user"), v.literal("system")),
    payload: v.any()
  },
  handler: async (ctx, args) => {
    const { userId } = await assertApplicationOwner(ctx, args.applicationId);
    await appendAuditEvent(ctx, {
      applicationId: args.applicationId,
      userId,
      actor: args.actor,
      eventType: args.eventType,
      payload: args.payload
    });
    return { ok: true };
  }
});

export const attachDocumentText = mutation({
  args: {
    documentId: v.id("documents"),
    extractedText: v.string()
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new ConvexError("Document not found");
    }
    if (document.userId !== userId) {
      throw new ConvexError("Forbidden");
    }

    await ctx.db.patch(args.documentId, {
      extractedText: args.extractedText
    });

    await appendAuditEvent(ctx, {
      applicationId: document.applicationId,
      userId,
      actor: "system",
      eventType: "text_extracted",
      payload: { documentId: args.documentId }
    });

    return { ok: true };
  }
});
