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
  className,
}: StatsCardProps) {
  const changeColors = {
    positive: "text-emerald-400",
    negative: "text-red-400",
    neutral: "text-white",
    warning: "text-amber-400",
  };

  const iconGlows = {
    positive: "shadow-emerald-500/25",
    negative: "shadow-red-500/25",
    neutral: "shadow-blue-500/25",
    warning: "shadow-amber-500/25",
  };

  return (
    <div className={cn("premium-card p-5 relative overflow-hidden", className)}>
      {/* subtle top-left glow */}
      <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-[rgba(59,130,246,0.1)] blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-white">
            {title}
          </p>
          <p className="text-[2rem] font-bold text-[#F3F7FC] leading-none tracking-tight">
            {value}
          </p>
          {change && (
            <p className={cn("text-xs font-medium mt-1", changeColors[changeType])}>
              {change}
            </p>
          )}
        </div>
        <div
          className={cn(
            "p-2.5 bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white rounded-xl flex-shrink-0 ml-3 shadow-lg",
            iconGlows[changeType]
          )}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}


