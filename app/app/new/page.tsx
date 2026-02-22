import { AppStepper } from "@/components/app-stepper";
import { NewApplicationFlow } from "@/components/features/new-application-flow";

export default function NewApplicationPage() {
  return (
    <div className="space-y-4">
      <AppStepper current={0} />
      <NewApplicationFlow />
    </div>
  );
}
