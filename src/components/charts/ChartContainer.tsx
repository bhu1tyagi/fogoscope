import { cn } from "@/lib/utils/cn";
import Skeleton from "@/components/ui/Skeleton";
import LiveIndicator from "@/components/ui/LiveIndicator";

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  live?: boolean;
  className?: string;
}

export function ChartContainer({
  title,
  subtitle,
  children,
  actions,
  loading = false,
  live = false,
  className,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        "bg-bg-card rounded-xl border border-border-default p-4",
        className
      )}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
          {live && <LiveIndicator isLive={true} />}
          {subtitle && (
            <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {loading ? (
        <Skeleton className="w-full h-48" />
      ) : (
        children
      )}
    </div>
  );
}

export default ChartContainer;
