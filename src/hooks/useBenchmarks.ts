import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";

interface BenchmarkData {
  currentBlockTimeMs: number;
  avg24hBlockTimeMs: number;
  min24hBlockTimeMs: number;
  max24hBlockTimeMs: number;
  sub50msStreak: number;
  sub50msStreakActive: boolean;
  blockTimeHistory: { time: string; value: number }[];
  chains: { chain: string; tps: number; blockTimeMs: number; finality: string; validators: number; txs24h: number; live?: boolean }[];
}

export function useBenchmarks() {
  return useQuery<BenchmarkData>({
    queryKey: ["benchmarks"],
    queryFn: () => fetchAPI<BenchmarkData>("/api/benchmarks"),
    refetchInterval: POLLING.LIVE_METRICS,
  });
}
