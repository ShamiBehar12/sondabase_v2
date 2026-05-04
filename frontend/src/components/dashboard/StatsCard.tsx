import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral" | "warning";
  icon: LucideIcon;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  className
}: StatsCardProps) {
  const changeColors = {
    positive: "text-success",
    negative: "text-error",
    neutral: "text-foreground-muted",
    warning: "text-warning"
  };

  const accentGradients = {
    positive: "from-success/30 via-success/10 to-transparent",
    negative: "from-error/25 via-error/8 to-transparent",
    neutral: "from-primary/25 via-primary/8 to-transparent",
    warning: "from-warning/30 via-warning/10 to-transparent",
  };

  const iconColors = {
    positive: "bg-success/15 text-success",
    negative: "bg-error/15 text-error",
    neutral: "bg-gradient-primary text-white",
    warning: "bg-warning/15 text-warning",
  };

  return (
    <div className={cn("premium-card p-5 relative overflow-hidden", className)}>
      {/* Subtle top accent line */}
      <div className={cn(
        "absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r rounded-t-xl",
        accentGradients[changeType]
      )} />

      <div className="flex items-start justify-between gap-4 pt-1">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{title}</p>
          <p className="text-[2rem] font-bold leading-none text-foreground tabular-nums">{value}</p>
          {change && (
            <p className={cn("text-xs font-medium pt-0.5", changeColors[changeType])}>
              {change}
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-lg flex-shrink-0 mt-0.5", iconColors[changeType])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}