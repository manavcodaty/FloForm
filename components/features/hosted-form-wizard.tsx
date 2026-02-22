"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

type FormField = {
  id: string;
  label: string;
  type: "text" | "email" | "tel" | "date" | "number" | "textarea" | "select" | "checkbox" | "multiselect";
  required: boolean;
  options?: string[];
  step: number;
};

type DraftField = {
  value: string | number | boolean | null;
  confidence: number;
  evidence: { snippet: string };
  lastUpdatedBy: "agent" | "user";
};

export function HostedFormWizard({
  applicationId,
  fields,
  initialDraft,
  finalApprovalApproved,
  pendingFinalTaskId
}: {
  applicationId: string;
  fields: FormField[];
  initialDraft: Record<string, DraftField>;
  finalApprovalApproved: boolean;
  pendingFinalTaskId: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Record<string, DraftField>>(initialDraft);
  const [submitting, setSubmitting] = useState(false);

  const fieldsForStep = useMemo(() => fields.filter((field) => field.step === step), [fields, step]);
  const progress = Math.round((step / 5) * 100);

  async function persist(fieldId: string, value: string | number | boolean | null) {
    const current = draft[fieldId];
    const payload = {
      applicationId,
      fieldId,
      value,
      confidence: current?.confidence ?? 1,
      evidence: current?.evidence ?? { snippet: "User input" },
      updatedBy: "user"
    };

    await fetch("/api/draft/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  async function requestFinalApproval() {
    setSubmitting(true);
    try {
      await fetch("/api/submit/request-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId })
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function resolveFinalApproval(decision: "approve" | "reject") {
    if (!pendingFinalTaskId) return;
    setSubmitting(true);
    try {
      await fetch("/api/approvals/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: pendingFinalTaskId, decision })
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function finalizeSubmit() {
    setSubmitting(true);
    try {
      await fetch("/api/submit/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId })
      });
      router.push(`/app/applications/${applicationId}/submitted`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scholarship form</CardTitle>
          <CardDescription>Step {step} of 5</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} />
          <div className="grid gap-3">
            {fieldsForStep.map((field) => {
              const current = draft[field.id];
              const value = current?.value;
              const isAgentFilled = current?.lastUpdatedBy === "agent";

              return (
                <label key={field.id} className="space-y-1">
                  <span className="text-sm font-medium">{field.label}</span>
                  {field.type === "textarea" ? (
                    <Textarea
                      aria-label={field.label}
                      value={String(value ?? "")}
                      className={isAgentFilled ? "bg-[#FFF6DA] transition-colors" : ""}
                      onChange={(e) => {
                        const next = e.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          [field.id]: {
                            value: next,
                            confidence: prev[field.id]?.confidence ?? 1,
                            evidence: prev[field.id]?.evidence ?? { snippet: "User input" },
                            lastUpdatedBy: "user"
                          }
                        }));
                        void persist(field.id, next);
                      }}
                    />
                  ) : field.type === "select" ? (
                    <select
                      aria-label={field.label}
                      className={`h-10 w-full rounded-md border border-[#95DCD6] px-3 text-sm ${isAgentFilled ? "bg-[#FFF6DA]" : "bg-white"}`}
                      value={String(value ?? "")}
                      onChange={(e) => {
                        const next = e.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          [field.id]: {
                            value: next,
                            confidence: prev[field.id]?.confidence ?? 1,
                            evidence: prev[field.id]?.evidence ?? { snippet: "User input" },
                            lastUpdatedBy: "user"
                          }
                        }));
                        void persist(field.id, next);
                      }}
                    >
                      <option value="">Select</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <input
                      aria-label={field.label}
                      type="checkbox"
                      checked={Boolean(value)}
                      className="h-5 w-5"
                      onChange={(e) => {
                        const next = e.target.checked;
                        setDraft((prev) => ({
                          ...prev,
                          [field.id]: {
                            value: next,
                            confidence: prev[field.id]?.confidence ?? 1,
                            evidence: prev[field.id]?.evidence ?? { snippet: "User input" },
                            lastUpdatedBy: "user"
                          }
                        }));
                        void persist(field.id, next);
                      }}
                    />
                  ) : (
                    <Input
                      aria-label={field.label}
                      type={field.type}
                      className={isAgentFilled ? "bg-[#FFF6DA] transition-colors" : ""}
                      value={String(value ?? "")}
                      onChange={(e) => {
                        const next = field.type === "number" ? Number(e.target.value) : e.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          [field.id]: {
                            value: next,
                            confidence: prev[field.id]?.confidence ?? 1,
                            evidence: prev[field.id]?.evidence ?? { snippet: "User input" },
                            lastUpdatedBy: "user"
                          }
                        }));
                        void persist(field.id, next);
                      }}
                    />
                  )}
                  {isAgentFilled ? <Badge variant="warning">Auto-filled</Badge> : null}
                </label>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={step <= 1} onClick={() => setStep((prev) => prev - 1)}>Back</Button>
            <Button disabled={step >= 5} onClick={() => setStep((prev) => prev + 1)}>Next</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ready to submit</CardTitle>
          <CardDescription>Final submission always requires explicit approval.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {finalApprovalApproved ? <CheckCircle2 className="h-4 w-4 text-[#1F766F]" /> : null}
            {finalApprovalApproved ? "Final approval is granted." : "Final approval is still required."}
          </div>
          {!finalApprovalApproved && !pendingFinalTaskId ? (
            <Button onClick={requestFinalApproval} loading={submitting}>Request final approval</Button>
          ) : null}
          {!finalApprovalApproved && pendingFinalTaskId ? (
            <div className="flex gap-2">
              <Button onClick={() => resolveFinalApproval("approve")} loading={submitting}>Approve final submit</Button>
              <Button variant="destructive" onClick={() => resolveFinalApproval("reject")} loading={submitting}>Reject</Button>
            </div>
          ) : null}
          {finalApprovalApproved ? (
            <Button onClick={finalizeSubmit} loading={submitting}>Submit application</Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
