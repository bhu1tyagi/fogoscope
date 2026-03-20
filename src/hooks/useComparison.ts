import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";
import type { ComparisonData } from "@/types/metrics";

export function useComparison() {
  return useQuery<ComparisonData>({
    queryKey: ["comparison"],
    queryFn: () => fetchAPI<ComparisonData>("/api/compare"),
    refetchInterval: POLLING.COMPARISON,
  });
}
