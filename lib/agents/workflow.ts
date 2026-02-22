import OpenAI from "openai";
import { inspect } from "node:util";
import { z } from "zod";
import { env, getGitHubModelsKey } from "@/lib/env";
import { SCHOLARSHIP_FORM_SCHEMA } from "@/lib/form-schema";
import {
  fieldMappingPlanSchema,
  fillDraftSchema,
  userProfileSchema,
  type FieldMappingPlan,
  type UserProfile
} from "@/lib/schemas";
import { convexMutation, convexQuery } from "@/lib/convex-server";
import { idFrom } from "@/lib/utils";

type StreamCallback = (event: {
  type: string;
  message?: string;
  payload?: Record<string, unknown>;
}) => Promise<void> | void;

type RunWorkflowInput = {
  applicationId: string;
  runId?: string;
  resumeRunId?: string;
  approvalDecisions?: Array<{ interruptionId: string; decision: "approve" | "reject" }>;
  onEvent: StreamCallback;
};

const setFieldValueInputSchema = z.object({
  fieldId: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  confidence: z.number().min(0).max(1),
  evidence: z.object({
    snippet: z.string(),
    lineRef: z.string(),
    documentName: z.string()
  })
});

const bulkSetFieldsInputSchema = z.object({
  items: z.array(
    z.object({
      fieldId: z.string(),
      value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      confidence: z.number().min(0).max(1),
      evidence: z.object({
        snippet: z.string(),
        lineRef: z.string(),
        documentName: z.string()
      })
    })
  )
});

const requestApprovalInputSchema = z.object({
  kind: z.literal("flagged_field"),
  reason: z.string(),
  items: z.array(
    z.object({
      fieldId: z.string(),
      proposedValue: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      confidence: z.number().min(0).max(1),
      evidence: z.object({ snippet: z.string() }),
      reason: z.string()
    })
  )
});

function toConvexSafeJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (item === undefined) return null;
      if (typeof item === "bigint") return item.toString();
      return item;
    })
  ) as T;
}

function sanitizeInterruptionForStorage(interruption: any) {
  try {
    return toConvexSafeJson({
      id: interruption?.id ?? interruption?.rawItem?.callId ?? interruption?.rawItem?.id ?? null,
      type: interruption?.type ?? null,
      toolName: interruption?.toolName ?? interruption?.rawItem?.name ?? null,
      agent: interruption?.agent?.name ? { name: interruption.agent.name } : null,
      rawItem: interruption?.rawItem
        ? {
            id: interruption.rawItem.id ?? null,
            type: interruption.rawItem.type ?? null,
            callId: interruption.rawItem.callId ?? null,
            name: interruption.rawItem.name ?? null,
            arguments: interruption.rawItem.arguments ?? null
          }
        : null
    });
  } catch {
    return {
      id: interruption?.id ?? interruption?.rawItem?.callId ?? null,
      type: interruption?.type ?? "tool_approval_item",
      toolName: interruption?.toolName ?? null,
      agent: null,
      rawItem: null
    };
  }
}

function getInterruptionsFromRunState(runState: any) {
  const candidates = [
    runState?.currentStep?.data?.interruptions,
    runState?.interruptions,
    runState?.state?.currentStep?.data?.interruptions
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }
  return [];
}

function detectSecrets(input: string) {
  const secretPatterns = [
    /(sk-[a-zA-Z0-9]{20,})/g,
    /(ghp_[a-zA-Z0-9]{30,})/g,
    /(AKIA[0-9A-Z]{16})/g
  ];
  return secretPatterns.some((pattern) => pattern.test(input));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseYYMMDD(value: string) {
  if (!/^\d{6}$/.test(value)) return undefined;
  const yy = Number(value.slice(0, 2));
  const mm = Number(value.slice(2, 4));
  const dd = Number(value.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return undefined;
  const currentYY = new Date().getFullYear() % 100;
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy;
  return `${year.toString().padStart(4, "0")}-${mm.toString().padStart(2, "0")}-${dd.toString().padStart(2, "0")}`;
}

function parsePassportFromMrz(rawText: string) {
  const normalizedLines = rawText
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, "").toUpperCase())
    .filter(Boolean);
  const mrzCandidates = normalizedLines.filter((line) => /[A-Z0-9<]{20,}/.test(line));
  if (mrzCandidates.length < 2) return null;

  const line1 = mrzCandidates[0];
  const line2 = mrzCandidates[1];
  if (!line1.startsWith("P<") || line2.length < 27) return null;

  const namesPart = line1.slice(5);
  const [surnameRaw, givenRaw] = namesPart.split("<<");
  const surname = normalizeWhitespace((surnameRaw ?? "").replace(/<+/g, " "));
  const givenNames = normalizeWhitespace((givenRaw ?? "").replace(/<+/g, " "));
  const [firstName, ...restNames] = givenNames.split(" ").filter(Boolean);
  const lastName = surname || restNames.join(" ");
  const nationality = line2.slice(10, 13).replace(/</g, "");
  const dob = parseYYMMDD(line2.slice(13, 19));

  return {
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    dob,
    nationality
  };
}

function mapNationalityToCitizenshipStatus(nationality?: string) {
  if (!nationality) return undefined;
  const code = nationality.toUpperCase();
  if (code === "USA" || code === "US") return "US Citizen";
  return "International";
}

function getEmptyProfile(): UserProfile {
  return userProfileSchema.parse({
    personal: {},
    address: {},
    education: {},
    employment: {},
    contact: {},
    locks: {}
  });
}

function heuristicExtractProfile(rawText: string): UserProfile {
  const profile = getEmptyProfile();
  const lines = rawText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const mrzPassport = parsePassportFromMrz(rawText);

  function pick(pattern: RegExp, fallbackLineContains?: string) {
    const match = rawText.match(pattern);
    if (match?.[1]) return match[1].trim();
    if (!fallbackLineContains) return "";
    const line = lines.find((item) => item.toLowerCase().includes(fallbackLineContains.toLowerCase()));
    return line ? line.split(":").slice(1).join(":").trim() : "";
  }

  const firstName = pick(/first\s*name\s*[:\-]\s*([^\n]+)/i);
  const lastName = pick(/last\s*name\s*[:\-]\s*([^\n]+)/i);
  const givenNamesLabel = pick(/given\s*names?\s*[:\-]\s*([^\n]+)/i);
  const surnameLabel = pick(/surname\s*[:\-]\s*([^\n]+)/i);
  const email = pick(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/i, "email") || (rawText.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? "");
  const phone = pick(/(\+?\d[\d\s\-().]{8,}\d)/, "phone");
  const school = pick(/(school|university|college)\s*[:\-]?\s*([^\n]+)/i) || "";
  const gpa = pick(/gpa\s*[:\-]\s*([0-4](?:\.\d+)?)/i);
  const cityState = pick(/address\s*[:\-]\s*([^\n]+)/i);
  const dobLabel =
    pick(/date\s*of\s*birth\s*[:\-]\s*([^\n]+)/i) ||
    pick(/birth\s*date\s*[:\-]\s*([^\n]+)/i);
  const nationalityLabel = pick(/nationality\s*[:\-]\s*([A-Za-z]{2,3}|[A-Za-z ]+)/i);

  const field = (value: string, confidence: number, lineRef: string) => ({
    value,
    confidence,
    evidence: {
      snippet: value || "No evidence found",
      lineRef
    },
    lastUpdatedBy: "agent" as const
  });

  const resolvedFirstName =
    firstName ||
    givenNamesLabel.split(" ").filter(Boolean)[0] ||
    mrzPassport?.firstName ||
    "";
  const resolvedLastName = lastName || surnameLabel || mrzPassport?.lastName || "";
  const resolvedDobRaw = dobLabel || mrzPassport?.dob || "";
  const resolvedDob = /^\d{6}$/.test(resolvedDobRaw) ? parseYYMMDD(resolvedDobRaw) ?? "" : resolvedDobRaw;
  const citizenshipStatus =
    mapNationalityToCitizenshipStatus(nationalityLabel) ||
    mapNationalityToCitizenshipStatus(mrzPassport?.nationality);

  if (resolvedFirstName) profile.personal.first_name = field(resolvedFirstName, 0.9, "first_name");
  if (resolvedLastName) profile.personal.last_name = field(resolvedLastName, 0.9, "last_name");
  if (resolvedDob) {
    profile.personal.date_of_birth = field(resolvedDob, 0.86, "date_of_birth");
    profile.personal.dob = field(resolvedDob, 0.86, "dob");
  }
  if (citizenshipStatus) {
    profile.personal.citizenship_status = field(citizenshipStatus, 0.8, "citizenship_status");
  }
  if (email) profile.contact.email = field(email, 0.92, "email");
  if (phone) profile.contact.phone = field(phone, 0.86, "phone");
  if (school) profile.education.school = field(school, 0.78, "school");
  if (gpa) profile.education.gpa = field(gpa, 0.82, "gpa");
  if (cityState) profile.address.city_state = field(cityState, 0.72, "address");

  return userProfileSchema.parse(profile);
}

function heuristicMapFields(profile: UserProfile): FieldMappingPlan {
  const allProfileFields = Object.entries(profile).flatMap(([section, sectionData]) => {
    if (section === "locks") return [] as Array<{ path: string; value: any; confidence: number; evidence: any }>;
    return Object.entries(sectionData as Record<string, any>).map(([fieldKey, fieldValue]) => ({
      path: `${section}.${fieldKey}`,
      value: fieldValue.value,
      confidence: fieldValue.confidence,
      evidence: fieldValue.evidence
    }));
  });

  const mappings = SCHOLARSHIP_FORM_SCHEMA.fields.map((field) => {
    const direct = allProfileFields.find((item) => {
      const key = item.path.toLowerCase();
      return key.includes(field.id.replace(/_/g, "")) || key.includes(field.label.toLowerCase().replace(/\s+/g, "_"));
    });

    const fallback = allProfileFields.find((item) => item.path.includes(field.section));
    const source = direct ?? fallback;
    const value = source?.value ?? (field.type === "checkbox" ? false : "");
    const confidence = source?.confidence ?? 0.55;

    return {
      formFieldId: field.id,
      profileFieldPath: source?.path ?? "manual.required",
      proposedValue: value,
      transformation: source ? "direct" : "manual",
      confidence,
      evidence: source?.evidence ?? {
        snippet: "No direct evidence found"
      },
      needsHuman: confidence < 0.75 || field.sensitive,
      reason: confidence < 0.75 ? "Low confidence mapping" : field.sensitive ? "Sensitive field" : undefined
    };
  });

  const requiredHumanFields = mappings.filter((item) => item.needsHuman).map((item) => item.formFieldId);

  return fieldMappingPlanSchema.parse({
    mappings,
    requiredHumanFields,
    notes: ["Heuristic mapper fallback used for deterministic hosted form"]
  });
}

function ensureSubmittedClaimGuardrail(output: unknown) {
  if (typeof output === "string" && /submitted|submission complete/i.test(output)) {
    throw new Error("Output guardrail tripped: submission claims are blocked unless submit tool confirms success.");
  }
}

async function setupAgentsSdk() {
  const Agents = (await import("@openai/agents")) as any;
  const apiKey = getGitHubModelsKey();
  if (!apiKey) {
    throw new Error("Missing GITHUB_TOKEN or GITHUB_MODELS_API_KEY");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: env.GITHUB_MODELS_BASE_URL
  });

  if (typeof Agents.setDefaultOpenAIClient === "function") {
    Agents.setDefaultOpenAIClient(client);
  }
  if (typeof Agents.setOpenAIAPI === "function") {
    Agents.setOpenAIAPI("chat_completions");
  }

  const tracingEnabled = env.ENABLE_TRACING === "true";
  if (!tracingEnabled && typeof Agents.setTracingDisabled === "function") {
    Agents.setTracingDisabled(true);
  }

  if (tracingEnabled && env.OPENAI_TRACING_API_KEY && typeof Agents.setTracingExportApiKey === "function") {
    Agents.setTracingExportApiKey(env.OPENAI_TRACING_API_KEY);
  }

  return Agents;
}

function asSafeText(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function runCreateApplicationAndFillWorkflow(input: RunWorkflowInput) {
  const Agents = await setupAgentsSdk();
  const runId = input.runId ?? `run_${Date.now()}_${idFrom([input.applicationId])}`;

  await convexMutation("klerki:logAuditEvent", {
    applicationId: input.applicationId,
    actor: "system",
    eventType: "run_started",
    payload: { runId, workflow: "CREATE_APPLICATION_AND_FILL" }
  });

  await input.onEvent({ type: "status", message: "Loading documents" });
  const documents = await convexQuery<{ applicationId: string }, any[]>("klerki:getDocuments", {
    applicationId: input.applicationId
  });

  const rawText = documents
    .map((doc) => doc.extractedText)
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (detectSecrets(rawText)) {
    await convexMutation("klerki:logAuditEvent", {
      applicationId: input.applicationId,
      actor: "system",
      eventType: "guardrail_input_rejected",
      payload: { runId, reason: "secret_detected" }
    });
    throw new Error("Input guardrail tripped: detected likely secret in uploaded text.");
  }

  await input.onEvent({ type: "status", message: "Configuring agents" });

  const extractProfileTool = Agents.tool({
    name: "extract_profile",
    description: "Extract a structured user profile from raw document text with evidence and confidence.",
    parameters: z.object({ rawText: z.string().min(1) }),
    execute: async ({ rawText }: { rawText: string }) => {
      await input.onEvent({ type: "step", message: "ExtractorAgent running" });
      const fallback = heuristicExtractProfile(rawText);
      return fallback;
    }
  });

  const mapFieldsTool = Agents.tool({
    name: "map_fields",
    description:
      "Map extracted profile fields to scholarship form fields with confidence and required-human flags. profileJson must be a JSON string.",
    // Keep tool-call schema compatible with chat-completions function JSON schema.
    parameters: z.object({ profileJson: z.string() }),
    execute: async ({ profileJson }: { profileJson: string }) => {
      await input.onEvent({ type: "step", message: "MapperAgent running" });
      let parsed: unknown;
      try {
        parsed = JSON.parse(profileJson);
      } catch (error) {
        throw new Error(`map_fields profileJson is not valid JSON: ${String(error)}`);
      }
      const validatedProfile = userProfileSchema.safeParse(parsed).success
        ? userProfileSchema.parse(parsed)
        : getEmptyProfile();
      const mapped = heuristicMapFields(validatedProfile);
      return mapped;
    }
  });

  const setFieldValueTool = Agents.tool({
    name: "set_field_value",
    description: "Set one draft field value in hosted form state.",
    parameters: setFieldValueInputSchema,
    execute: async ({ fieldId, value, confidence, evidence }: z.infer<typeof setFieldValueInputSchema>) => {
      await convexMutation("klerki:setDraftField", {
        applicationId: input.applicationId,
        fieldId,
        value,
        confidence,
        evidence,
        updatedBy: "agent"
      });
      return { ok: true, fieldId };
    }
  });

  const bulkSetFieldsTool = Agents.tool({
    name: "bulk_set_fields",
    description: "Apply multiple field values to hosted form state. Sensitive/low-confidence values should require approval.",
    parameters: bulkSetFieldsInputSchema,
    needsApproval: ({ items }: z.infer<typeof bulkSetFieldsInputSchema>) =>
      items.some((item) => item.confidence < 0.75),
    execute: async ({ items }: z.infer<typeof bulkSetFieldsInputSchema>) => {
      const result = await convexMutation("klerki:bulkSetDraftFields", {
        applicationId: input.applicationId,
        items: items.map((item) => ({ ...item, updatedBy: "agent" }))
      });
      return result;
    }
  });

  const requestApprovalTool = Agents.tool({
    name: "request_approval",
    description: "Create a human approval task for flagged fields or final submission.",
    parameters: requestApprovalInputSchema,
    needsApproval: true,
    execute: async ({ kind, reason, items }: z.infer<typeof requestApprovalInputSchema>) => {
      return convexMutation("klerki:createApprovalTask", {
        applicationId: input.applicationId,
        kind,
        items,
        reason
      });
    }
  });

  const submitFormTool = Agents.tool({
    name: "submit_form",
    description: "Request final submit approval. Never submit automatically without explicit human approval.",
    parameters: z.object({ reason: z.string() }),
    needsApproval: true,
    execute: async ({ reason }: { reason: string }) => {
      await convexMutation("klerki:createApprovalTask", {
        applicationId: input.applicationId,
        kind: "final_submit",
        items: [],
        reason: reason || "Final submission requires explicit approval"
      });
      return {
        submitted: false,
        message: "Final approval task created. Waiting for user approval before submission."
      };
    }
  });

  const saveDocumentTextTool = Agents.tool({
    name: "save_document_text",
    description: "Save extracted text notes for auditing.",
    parameters: z.object({ note: z.string() }),
    execute: async ({ note }: { note: string }) => {
      await convexMutation("klerki:createApprovalTask", {
        applicationId: input.applicationId,
        kind: "flagged_field",
        items: [],
        reason: `Audit note: ${note.slice(0, 200)}`
      });
      return { ok: true };
    }
  });

  const extractorAgent = new Agents.Agent({
    name: "ExtractorAgent",
    instructions:
      "Extract a structured user profile from document text. Include confidence [0,1] and exact evidence snippets for every field.",
    model: env.GITHUB_MODELS_AGENT_MODEL,
    outputType: userProfileSchema
  });

  const mapperAgent = new Agents.Agent({
    name: "MapperAgent",
    instructions:
      "Map user profile fields to the scholarship form schema with deterministic transformations, confidence, and human-required flags.",
    model: env.GITHUB_MODELS_AGENT_MODEL,
    outputType: fieldMappingPlanSchema
  });

  const fillerSupervisorAgent = new Agents.Agent({
    name: "FillerSupervisorAgent",
    instructions: [
      "You orchestrate CREATE_APPLICATION_AND_FILL.",
      "Never submit without explicit human approval.",
      "Prefer deterministic mappings. Flag low confidence values.",
      "Use tools to extract profile, map fields, and bulk set draft fields.",
      "Use request_approval only for flagged_field approvals.",
      "You must produce a clear action log.",
      "Never claim submission happened unless submit_form tool explicitly confirms submitted=true."
    ].join("\n"),
    model: env.GITHUB_MODELS_AGENT_MODEL,
    tools: [
      saveDocumentTextTool,
      extractProfileTool,
      mapFieldsTool,
      setFieldValueTool,
      bulkSetFieldsTool,
      requestApprovalTool,
      submitFormTool
    ]
  });

  const session = Agents.MemorySession ? new Agents.MemorySession() : undefined;
  const conversationInput = [
    `Workflow: CREATE_APPLICATION_AND_FILL`,
    `Application ID: ${input.applicationId}`,
    `Form schema title: ${SCHOLARSHIP_FORM_SCHEMA.title}`,
    `Form schema fields: ${JSON.stringify(SCHOLARSHIP_FORM_SCHEMA.fields)}`,
    `Documents text: ${rawText || "No text extracted"}`,
    "Steps: extract profile -> save profile -> map fields -> save mapping -> create fill draft -> bulk fill -> request approvals for uncertain fields.",
    "When calling map_fields, pass profileJson as JSON.stringify(the full profile object)."
  ].join("\n\n");

  await input.onEvent({ type: "status", message: "Running supervisor agent with streaming" });

  let runState: any = undefined;
  if (input.resumeRunId) {
    const snapshot = await convexQuery<{ runId: string }, any>("klerki:getRunStateSnapshot", {
      runId: input.resumeRunId
    });
    if (snapshot?.stateJson && Agents.RunState?.fromString) {
      runState = Agents.RunState.fromString(snapshot.stateJson);
      if (input.approvalDecisions?.length) {
        const liveInterruptions = getInterruptionsFromRunState(runState);
        const sourceInterruptions = liveInterruptions.length > 0 ? liveInterruptions : snapshot.interruptions ?? [];
        for (const interruption of sourceInterruptions) {
          const decision = input.approvalDecisions.find((d) => d.interruptionId === interruption.id);
          if (!decision) continue;
          if (decision.decision === "approve") {
            runState.approve(interruption);
          } else {
            runState.reject(interruption);
          }
        }
      }
    }
  }

  const runConfig: any = {
    stream: true,
    session,
    workflowName: "CREATE_APPLICATION_AND_FILL",
    tracing: env.ENABLE_TRACING === "true"
  };
  if (runState) {
    runConfig.state = runState;
  }

  console.log("[workflow] starting Agents.run", inspect({ applicationId: input.applicationId, runId, runConfig }, { depth: null, maxStringLength: null }));
  const stream = await Agents.run(fillerSupervisorAgent, conversationInput, runConfig);

  for await (const event of stream) {
    console.log("[workflow][stream-event]", inspect(event, { depth: null, maxArrayLength: null, maxStringLength: null }));
    await input.onEvent({
      type: "stream_event",
      message: event?.type ?? "stream",
      payload: event
    });
  }

  await stream.completed;
  console.log("[workflow] stream.completed", inspect({ runId, interruptions: stream.interruptions?.length ?? 0 }, { depth: null }));

  const finalOutput = stream.output ?? stream.finalOutput ?? null;
  ensureSubmittedClaimGuardrail(finalOutput);

  const extractedProfile = userProfileSchema.parse(heuristicExtractProfile(rawText || ""));
  await convexMutation("klerki:saveExtractedProfile", {
    applicationId: input.applicationId,
    profile: extractedProfile
  });

  const mappingPlan = fieldMappingPlanSchema.parse(heuristicMapFields(extractedProfile));
  await convexMutation("klerki:saveMappingPlan", {
    applicationId: input.applicationId,
    mappingPlan
  });

  const draft = fillDraftSchema.parse({
    fields: Object.fromEntries(
      mappingPlan.mappings.map((item) => [
        item.formFieldId,
        {
          value: item.proposedValue,
          confidence: item.confidence,
          evidence: item.evidence,
          lastUpdatedBy: "agent"
        }
      ])
    ),
    highlightedChanges: mappingPlan.mappings.map((item) => item.formFieldId),
    status: mappingPlan.requiredHumanFields.length > 0 ? "needs_review" : "ready_to_submit"
  });

  await convexMutation("klerki:saveFillDraft", {
    applicationId: input.applicationId,
    draft
  });

  await convexMutation("klerki:bulkSetDraftFields", {
    applicationId: input.applicationId,
    items: mappingPlan.mappings.map((item) => ({
      fieldId: item.formFieldId,
      value: item.proposedValue,
      confidence: item.confidence,
      evidence: item.evidence,
      updatedBy: "agent"
    }))
  });

  const interruptions = stream.interruptions ?? [];
  const safeInterruptions = interruptions.map(sanitizeInterruptionForStorage);
  if (interruptions.length > 0) {
    const stateJson =
      typeof stream.state?.toString === "function"
        ? stream.state.toString()
        : JSON.stringify(stream.state ?? {});
    await convexMutation("klerki:saveRunStateSnapshot", {
      applicationId: input.applicationId,
      runId,
      stateJson,
      interruptions: safeInterruptions,
      status: "active"
    });

    await input.onEvent({
      type: "interruption",
      message: `${interruptions.length} approval interruptions pending`,
      payload: {
        runId,
        interruptions: safeInterruptions.map((item: any) => ({
          id: item.id,
          toolName: item.toolName,
          type: item.type
        }))
      }
    });
    await convexMutation("klerki:logAuditEvent", {
      applicationId: input.applicationId,
      actor: "agent",
      eventType: "run_interrupted",
      payload: { runId, interruptions: interruptions.length }
    });
  } else {
    await convexMutation("klerki:saveRunStateSnapshot", {
      applicationId: input.applicationId,
      runId,
      stateJson: JSON.stringify({ completed: true }),
      interruptions: [],
      status: "resolved"
    });
  }

  await convexMutation("klerki:logAuditEvent", {
    applicationId: input.applicationId,
    actor: "system",
    eventType: "run_completed",
    payload: { runId }
  });

  await input.onEvent({
    type: "completed",
    message: "Workflow completed",
    payload: {
      runId,
      output: asSafeText(finalOutput)
    }
  });

  return { runId, interruptions };
}
