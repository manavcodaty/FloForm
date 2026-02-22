import { cn } from "@/lib/utils";

const STEPS = [
  "Upload",
  "Extraction",
  "Mapping",
  "Review",
  "Form",
  "Submit"
];

export function AppStepper({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-6 gap-2" aria-label="Application progress">
      {STEPS.map((step, index) => {
        const isActive = index <= current;
        return (
          <li
            key={step}
            className={cn(
              "rounded-md border px-2 py-1 text-center text-xs",
              isActive ? "border-[#39B7AD] bg-[#39B7AD] text-white" : "border-[#B8EAE5] text-slate-600"
            )}
          >
            {step}
          </li>
        );
      })}
    </ol>
  );
}
