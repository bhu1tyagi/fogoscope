import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { fogoConnection } from "@/lib/blockchain/connection";
import { getOrFetch, CacheTier } from "@/lib/redis/cache";
import { shortenAddress } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";

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

const COLORS = [
  "#06b6d4", "#9945FF", "#22c55e", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#f97316", "#8b5cf6", "#14b8a6",
];

async function fetchValidatorData(): Promise<ValidatorData> {
  const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [voteAccounts, blockStats] = await Promise.all([
    fogoConnection.getVoteAccounts().catch(() => ({ current: [], delinquent: [] })),
    prisma.$queryRaw<{ leader: string; blocks: number; avg_bt: number }[]>`
      SELECT
        leader,
        COUNT(*)::int as blocks,
        AVG("blockTimeMs")::float as avg_bt
      FROM "BlockMetric"
      WHERE timestamp > ${h24} AND leader IS NOT NULL
      GROUP BY leader
    `.catch(() => [] as { leader: string; blocks: number; avg_bt: number }[]),
  ]);

  const blockStatsMap = new Map(blockStats.map((b) => [b.leader, b]));

  const totalStakeLamports = [...voteAccounts.current, ...voteAccounts.delinquent]
    .reduce((sum, v) => sum + v.activatedStake, 0);
  const totalStake = totalStakeLamports / 1e9;

  const mapValidator = (v: typeof voteAccounts.current[0], isActive: boolean): ValidatorInfo => {
    const stats = blockStatsMap.get(v.nodePubkey);
    return {
      votePubkey: v.votePubkey,
      nodePubkey: v.nodePubkey,
      activatedStake: v.activatedStake / 1e9,
      stakePercent: totalStakeLamports > 0 ? (v.activatedStake / totalStakeLamports) * 100 : 0,
      commission: v.commission,
      lastVote: v.lastVote,
      blocksProduced24h: stats?.blocks ?? 0,
      avgBlockTimeMs: stats?.avg_bt ?? 0,
      isActive,
    };
  };

  const validators = [
    ...voteAccounts.current.map((v) => mapValidator(v, true)),
    ...voteAccounts.delinquent.map((v) => mapValidator(v, false)),
  ].sort((a, b) => b.activatedStake - a.activatedStake);

  const totalBlocksProduced24h = blockStats.reduce((sum, b) => sum + b.blocks, 0);

  // Build stake distribution for PieChart
  const top = validators.slice(0, 10);
  const othersStake = validators.slice(10).reduce((s, v) => s + v.activatedStake, 0);
  const stakeDistribution = top.map((v, i) => ({
    name: shortenAddress(v.votePubkey, 4),
    value: v.activatedStake,
    color: COLORS[i % COLORS.length],
  }));
  if (othersStake > 0) {
    stakeDistribution.push({ name: "Others", value: othersStake, color: "#475569" });
  }

  return { validators, totalStake, stakeDistribution, totalBlocksProduced24h };
}

export async function GET() {
  try {
    const data = await getOrFetch<ValidatorData>(
      "api:validators",
      CacheTier.AGGREGATED,
      fetchValidatorData
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] /api/validators error:", error);
    return NextResponse.json({ error: "Failed to fetch validator data" }, { status: 500 });
  }
}
