import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";
import type { MEVSummary } from "@/types/metrics";

export interface UseMEVParams {
  timeRange?: string;
}

export function useMEV(params: UseMEVParams = {}) {
  const qs = params.timeRange ? `?timeRange=${params.timeRange}` : "";

  return useQuery<MEVSummary>({
    queryKey: ["mev", params.timeRange],
    queryFn: () => fetchAPI<MEVSummary>(`/api/mev${qs}`),
    refetchInterval: POLLING.STANDARD,
  });
}
