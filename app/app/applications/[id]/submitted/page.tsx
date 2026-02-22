import { AppStepper } from "@/components/app-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintButton } from "@/components/print-button";
import { formatDateTime } from "@/lib/utils";
import { getApplicationData, getApplicationDraft } from "@/lib/server-data";

export default async function SubmittedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [application, draftDoc] = await Promise.all([
    getApplicationData(id),
    getApplicationDraft(id)
  ]);

  const submittedAt = application?.submittedAt;
  const fields = Object.entries(draftDoc?.draft?.fields ?? {});
  const json = JSON.stringify({ application, draft: draftDoc?.draft }, null, 2);
  const downloadHref = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

  return (
    <div className="space-y-4">
      <AppStepper current={5} />
      <Card>
        <CardHeader>
          <CardTitle>Submission summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="success">Submitted</Badge>
            {submittedAt ? <span>Submitted at {formatDateTime(submittedAt)}</span> : <span>Not submitted yet</span>}
            {application?.submittedBy ? <span>Approver: {application.submittedBy}</span> : null}
          </div>
          <div className="grid gap-2 text-sm">
            {fields.map(([fieldId, payload]) => (
              <div key={fieldId} className="grid grid-cols-12 rounded border p-2">
                <div className="col-span-4 font-medium">{fieldId}</div>
                <div className="col-span-6">{String((payload as any).value ?? "")}</div>
                <div className="col-span-2 text-right">
                  <Badge variant={(payload as any).lastUpdatedBy === "user" ? "secondary" : "warning"}>
                    {(payload as any).lastUpdatedBy}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <a href={downloadHref} download={`floform-submission-${id}.json`}>
              <Button variant="secondary">Download JSON</Button>
            </a>
            <PrintButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
