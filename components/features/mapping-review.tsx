"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type MappingItem = {
  formFieldId: string;
  profileFieldPath: string;
  proposedValue: string | number | boolean | null;
  transformation: string;
  confidence: number;
  evidence: {
    snippet: string;
  };
  needsHuman: boolean;
  reason?: string;
};

type MappingPlan = {
  mappings: MappingItem[];
  requiredHumanFields: string[];
};

export function MappingReview({
  applicationId,
  mappingPlan,
  pendingApprovalCount
}: {
  applicationId: string;
  mappingPlan: MappingPlan | null;
  pendingApprovalCount: number;
}) {
  const [items, setItems] = useState<MappingItem[]>(mappingPlan?.mappings ?? []);
  const [loading, setLoading] = useState(false);

  const flagged = useMemo(
    () => items.filter((item) => item.needsHuman || item.confidence < 0.75),
    [items]
  );

  async function applyFill() {
    setLoading(true);
    try {
      await fetch("/api/review/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          items: items.map((item) => ({
            fieldId: item.formFieldId,
            value: item.proposedValue,
            confidence: item.confidence,
            evidence: item.evidence,
            updatedBy: "agent"
          }))
        })
      });
    } finally {
      setLoading(false);
    }
  }

  async function approveFlagged() {
    setLoading(true);
    try {
      const tasksRes = await fetch(`/api/approvals/list?applicationId=${applicationId}`);
      const taskData = await tasksRes.json();
      const pending = taskData.tasks?.filter((task: any) => task.status === "pending") ?? [];
      for (const task of pending) {
        await fetch("/api/approvals/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task._id, decision: "approve" })
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {flagged.length > 0 ? (
        <Card className="border-[#F2C94C]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#7A5A00]">
              <AlertTriangle className="h-4 w-4" /> Needs approval ({flagged.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#7A5A00]">
            {flagged.map((item) => (
              <div key={item.formFieldId} className="rounded border border-[#F2C94C] bg-[#FFF6DA] p-2">
                <div className="font-medium">{item.formFieldId}</div>
                <div>{item.reason ?? "Low confidence"}</div>
              </div>
            ))}
            <Button onClick={approveFlagged} loading={loading}>Approve flagged</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Mapping plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item, index) => (
            <div key={item.formFieldId} className="grid grid-cols-12 items-center gap-2 rounded border p-2 text-sm">
              <div className="col-span-3 font-medium">{item.formFieldId}</div>
              <div className="col-span-3 text-slate-600">{item.profileFieldPath}</div>
              <div className="col-span-3">
                <Input
                  aria-label={`Value for ${item.formFieldId}`}
                  value={String(item.proposedValue ?? "")}
                  onChange={(e) => {
                    const value = e.target.value;
                    setItems((prev) => prev.map((entry, i) => (i === index ? { ...entry, proposedValue: value, needsHuman: false } : entry)));
                  }}
                />
              </div>
              <div className="col-span-2"><ConfidenceBadge confidence={item.confidence} /></div>
              <div className="col-span-1">{item.needsHuman ? <Badge variant="warning">Needs approval</Badge> : <Badge variant="secondary">Auto</Badge>}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={applyFill} loading={loading}>Apply fill to form</Button>
        <Badge variant={pendingApprovalCount > 0 ? "warning" : "success"}>
          Pending approvals: {pendingApprovalCount}
        </Badge>
      </div>
    </div>
  );
}
