import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";
import type { LendingSummary } from "@/types/metrics";

export function useLending() {
  return useQuery<LendingSummary>({
    queryKey: ["lending"],
    queryFn: () => fetchAPI<LendingSummary>("/api/lending"),
    refetchInterval: POLLING.STANDARD,
  });
}
