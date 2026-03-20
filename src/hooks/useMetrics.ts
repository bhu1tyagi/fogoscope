import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";
import type { DashboardMetrics } from "@/types/metrics";

export function useMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ["metrics"],
    queryFn: () => fetchAPI<DashboardMetrics>("/api/metrics"),
    refetchInterval: POLLING.LIVE_METRICS,
  });
}
