import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#39B7AD] text-white",
        secondary: "border-transparent bg-[#F2C94C] text-[#5c4400]",
        success: "border-transparent bg-[#E3F8F6] text-[#1F766F]",
        warning: "border-transparent bg-[#FFF4CE] text-[#7A5A00]",
        danger: "border-transparent bg-red-100 text-red-900"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
