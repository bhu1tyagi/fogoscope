import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";
import type { WalletAnalysis } from "@/types/metrics";

export function useWallet(address: string | undefined) {
  return useQuery<WalletAnalysis>({
    queryKey: ["wallet", address],
    queryFn: () => fetchAPI<WalletAnalysis>(`/api/wallet/${address}`),
    enabled: !!address,
    refetchInterval: POLLING.STANDARD,
  });
}
