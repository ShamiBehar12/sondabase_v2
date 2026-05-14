import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#3B82F6] text-[#F8FBFF] hover:bg-[#3B82F6]/80",
        secondary:
          "border-transparent bg-[#1D2430] text-[#F3F7FC] hover:bg-[#1D2430]/80",
        destructive:
          "border-transparent bg-[#E5484D] text-[#F3F7FC] hover:bg-[#E5484D]/80",
        outline: "text-[#F3F7FC]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

