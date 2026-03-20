import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("rounded bg-border-default animate-shimmer", className)}
      style={{
        background:
          "linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.05) 50%, transparent 75%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}
