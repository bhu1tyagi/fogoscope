import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";
import type { TokenPrice } from "@/types/metrics";

export function usePrices() {
  return useQuery<TokenPrice[]>({
    queryKey: ["prices"],
    queryFn: () => fetchAPI<TokenPrice[]>("/api/prices"),
    refetchInterval: POLLING.PRICES,
  });
}
