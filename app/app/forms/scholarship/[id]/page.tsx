import { AppStepper } from "@/components/app-stepper";
import { HostedFormWizard } from "@/components/features/hosted-form-wizard";
import { getApplicationApprovals, getApplicationDraft } from "@/lib/server-data";
import { SCHOLARSHIP_FORM_SCHEMA } from "@/lib/form-schema";

export default async function HostedFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [draftDoc, approvals] = await Promise.all([
    getApplicationDraft(id),
    getApplicationApprovals(id)
  ]);

  const finalApprovalApproved = approvals.some(
    (task: any) => task.kind === "final_submit" && task.status === "approved"
  );
  const pendingFinalTask = approvals.find(
    (task: any) => task.kind === "final_submit" && task.status === "pending"
  );

  return (
    <div className="space-y-4">
      <AppStepper current={4} />
      <HostedFormWizard
        applicationId={id}
        fields={SCHOLARSHIP_FORM_SCHEMA.fields}
        initialDraft={draftDoc?.draft?.fields ?? {}}
        finalApprovalApproved={finalApprovalApproved}
        pendingFinalTaskId={pendingFinalTask?._id ?? null}
      />
    </div>
  );
}
