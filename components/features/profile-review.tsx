"use client";

import { useMemo, useState } from "react";
import { Eye, Lock, Unlock } from "lucide-react";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FieldValue = {
  value: string | number | boolean | null;
  confidence: number;
  evidence: {
    snippet: string;
    documentName?: string;
    lineRef?: string;
    page?: number;
  };
  lastUpdatedBy: "agent" | "user";
};

type Profile = {
  personal: Record<string, FieldValue>;
  address: Record<string, FieldValue>;
  education: Record<string, FieldValue>;
  employment: Record<string, FieldValue>;
  contact: Record<string, FieldValue>;
  locks?: Record<string, boolean>;
};

const SECTIONS: Array<keyof Profile> = ["personal", "address", "education", "employment", "contact"];

export function ProfileReview({ applicationId, initialProfile }: { applicationId: string; initialProfile: Profile | null }) {
  const [profile, setProfile] = useState<Profile>(
    initialProfile ?? {
      personal: {},
      address: {},
      education: {},
      employment: {},
      contact: {},
      locks: {}
    }
  );
  const [saving, setSaving] = useState(false);
  const [evidenceField, setEvidenceField] = useState<{ key: string; field: FieldValue } | null>(null);

  const totalFields = useMemo(
    () => SECTIONS.reduce((count, section) => count + Object.keys(profile[section] ?? {}).length, 0),
    [profile]
  );

  async function saveProfile() {
    setSaving(true);
    try {
      await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, profile })
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Extracted profile ({totalFields} fields)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {SECTIONS.map((section) => {
            const fields = profile[section] as Record<string, FieldValue>;
            return (
              <div key={section} className="space-y-2 rounded-lg border p-3">
                <h3 className="text-sm font-semibold capitalize">{section}</h3>
                <div className="space-y-2">
                  {Object.entries(fields).map(([fieldId, field]) => {
                    const lockKey = `${section}.${fieldId}`;
                    const locked = profile.locks?.[lockKey] ?? false;
                    return (
                      <div key={fieldId} className="grid grid-cols-12 items-center gap-2 rounded border p-2 text-sm">
                        <div className="col-span-3 font-medium">{fieldId}</div>
                        <div className="col-span-4">
                          <Input
                            aria-label={fieldId}
                            value={String(field.value ?? "")}
                            disabled={locked}
                            onChange={(e) => {
                              setProfile((prev) => ({
                                ...prev,
                                [section]: {
                                  ...(prev[section] as Record<string, FieldValue>),
                                  [fieldId]: {
                                    ...field,
                                    value: e.target.value,
                                    lastUpdatedBy: "user"
                                  }
                                }
                              }));
                            }}
                          />
                        </div>
                        <div className="col-span-2"><ConfidenceBadge confidence={field.confidence} /></div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`View evidence for ${fieldId}`}
                            onClick={() => setEvidenceField({ key: `${section}.${fieldId}`, field })}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="col-span-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={locked ? `Unlock ${fieldId}` : `Lock ${fieldId}`}
                            onClick={() => {
                              setProfile((prev) => ({
                                ...prev,
                                locks: {
                                  ...(prev.locks ?? {}),
                                  [lockKey]: !locked
                                }
                              }));
                            }}
                          >
                            {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />} {locked ? "Locked" : "Lock"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <Button onClick={saveProfile} loading={saving}>Save profile edits</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evidence viewer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {evidenceField ? (
            <>
              <p className="font-medium">{evidenceField.key}</p>
              <div className="rounded border bg-slate-50 p-2">{evidenceField.field.evidence.snippet}</div>
              <p className="text-slate-600">Document: {evidenceField.field.evidence.documentName ?? "Unknown"}</p>
              {evidenceField.field.evidence.page ? <p className="text-slate-600">Page: {evidenceField.field.evidence.page}</p> : null}
              {evidenceField.field.evidence.lineRef ? <p className="text-slate-600">Line: {evidenceField.field.evidence.lineRef}</p> : null}
            </>
          ) : (
            <p className="text-slate-500">Select "View evidence" for a field to inspect source snippet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
