import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";

interface ValidatorInfo {
  votePubkey: string;
  nodePubkey: string;
  activatedStake: number;
  stakePercent: number;
  commission: number;
  lastVote: number;
  blocksProduced24h: number;
  avgBlockTimeMs: number;
  isActive: boolean;
}

interface ValidatorData {
  validators: ValidatorInfo[];
  totalStake: number;
  stakeDistribution: { name: string; value: number; color: string }[];
  totalBlocksProduced24h: number;
}

export function useValidators() {
  return useQuery<ValidatorData>({
    queryKey: ["validators"],
    queryFn: () => fetchAPI<ValidatorData>("/api/validators"),
    refetchInterval: POLLING.STANDARD,
  });
}
