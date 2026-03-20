import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";
import type { NetworkStats } from "@/types/metrics";

export function useNetwork() {
  return useQuery<NetworkStats>({
    queryKey: ["network"],
    queryFn: () => fetchAPI<NetworkStats>("/api/network"),
    refetchInterval: POLLING.LIVE_METRICS,
  });
}
