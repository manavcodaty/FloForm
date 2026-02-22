import Link from "next/link";
import { AlertTriangle, Bot, CheckCircle2, Clock3, ShieldAlert, Wrench } from "lucide-react";
import { AppStepper } from "@/components/app-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { getApplicationApprovals, getApplicationAudit, getApplicationData } from "@/lib/server-data";

const iconByEvent: Record<string, any> = {
  run_started: <Bot className="h-4 w-4" />,
  extraction_completed: <CheckCircle2 className="h-4 w-4" />,
  mapping_completed: <CheckCircle2 className="h-4 w-4" />,
  bulk_fill_attempted: <Wrench className="h-4 w-4" />,
  approval_requested: <ShieldAlert className="h-4 w-4" />,
  approval_approved: <CheckCircle2 className="h-4 w-4" />,
  approval_rejected: <AlertTriangle className="h-4 w-4" />,
  submission_approved: <CheckCircle2 className="h-4 w-4" />
};

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [application, approvals, events] = await Promise.all([
    getApplicationData(id),
    getApplicationApprovals(id),
    getApplicationAudit(id)
  ]);

  const pendingInterruptions = approvals.filter((task: any) => task.status === "pending").length;

  return (
    <div className="space-y-4">
      <AppStepper current={2} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live step status</CardTitle>
            <CardDescription>
              Extraction → Mapping → Draft Fill
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded border p-3">Application: {application?.title ?? "Scholarship Application"}</div>
            <div className="rounded border p-3">Current status: {application?.status}</div>
            <div className="rounded border p-3">Progress: {application?.progress ?? 0}%</div>
            {pendingInterruptions > 0 ? (
              <div className="rounded border border-[#F2C94C] bg-[#FFF6DA] p-3 text-[#7A5A00]">
                Interruptions pending: {pendingInterruptions}
              </div>
            ) : (
              <div className="rounded border border-[#39B7AD] bg-[#E8F8F6] p-3 text-[#1F766F]">
                No pending interruptions.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link href={`/app/applications/${id}/profile`}><Button variant="secondary">Review Profile</Button></Link>
              <Link href={`/app/applications/${id}/review`}><Button variant="secondary">Review Mapping</Button></Link>
              <Link href={`/app/forms/scholarship/${id}`}><Button>Open Hosted Form</Button></Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event timeline</CardTitle>
            <CardDescription>Audit event feed</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-2 overflow-auto text-sm">
            {events.map((event: any) => (
              <div key={event._id} className="flex items-start gap-3 rounded border p-2">
                <div className="mt-0.5 text-slate-600">{iconByEvent[event.eventType] ?? <Clock3 className="h-4 w-4" />}</div>
                <div className="space-y-1">
                  <div className="font-medium">{event.eventType}</div>
                  <div className="text-slate-600">{formatDateTime(event.timestamp)}</div>
                  <Badge variant="secondary">{event.actor}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
