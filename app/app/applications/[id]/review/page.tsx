import Link from "next/link";
import { AppStepper } from "@/components/app-stepper";
import { MappingReview } from "@/components/features/mapping-review";
import { Button } from "@/components/ui/button";
import { getApplicationApprovals, getApplicationMapping } from "@/lib/server-data";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [mappingDoc, approvals] = await Promise.all([
    getApplicationMapping(id),
    getApplicationApprovals(id)
  ]);

  return (
    <div className="space-y-4">
      <AppStepper current={3} />
      <MappingReview
        applicationId={id}
        mappingPlan={mappingDoc?.mappingPlan ?? null}
        pendingApprovalCount={approvals.filter((task: any) => task.status === "pending").length}
      />
      <Link href={`/app/forms/scholarship/${id}`}>
        <Button variant="secondary">Go to hosted form</Button>
      </Link>
    </div>
  );
}
