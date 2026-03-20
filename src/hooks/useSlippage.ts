import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";
import type { SlippageData } from "@/types/metrics";

export interface UseSlippageParams {
  timeRange?: string;
  pair?: string;
  dex?: string;
}

function buildQueryString(params: UseSlippageParams): string {
  const searchParams = new URLSearchParams();

  if (params.timeRange) searchParams.set("timeRange", params.timeRange);
  if (params.pair) searchParams.set("pair", params.pair);
  if (params.dex) searchParams.set("dex", params.dex);

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export function useSlippage(params: UseSlippageParams = {}) {
  return useQuery<SlippageData>({
    queryKey: ["slippage", params.timeRange, params.pair, params.dex],
    queryFn: () =>
      fetchAPI<SlippageData>(`/api/slippage${buildQueryString(params)}`),
    refetchInterval: POLLING.STANDARD,
  });
}
