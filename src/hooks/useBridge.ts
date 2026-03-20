import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";
import type { BridgeSummary } from "@/types/metrics";

export interface UseBridgeParams {
  timeframe?: string;
}

export function useBridge(params: UseBridgeParams = {}) {
  const qs = params.timeframe ? `?timeframe=${params.timeframe}` : "";

  return useQuery<BridgeSummary>({
    queryKey: ["bridge", params.timeframe],
    queryFn: () => fetchAPI<BridgeSummary>(`/api/bridge${qs}`),
    refetchInterval: POLLING.BRIDGE,
  });
}
