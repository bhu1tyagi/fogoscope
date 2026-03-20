import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { getOrFetch, CacheTier } from "@/lib/redis/cache";
import {
  getInboundTransfers,
  getOutboundTransfers,
  WormholeTransfer,
} from "@/lib/external/wormholescan";
import type { BridgeSummary, BridgeTransfer } from "@/types/metrics";

export const dynamic = "force-dynamic";

/** Returns true when the chain identifier refers to the Fogo network. */
function isFogoChain(chain: string): boolean {
  return chain === "Fogo" || chain === "51" || chain.includes("undefined");
}

/** Map a DB BridgeTransfer row to the API response shape. */
function mapDbRow(row: {
  id: string;
  operationId: string;
  timestamp: Date;
  sourceChain: string;
  destChain: string;
  token: string;
  amount: Prisma.Decimal;
  amountUsd: Prisma.Decimal | null;
  senderAddress: string;
  recipientAddress: string;
  status: string;
}): BridgeTransfer {
  const direction: BridgeTransfer["direction"] = isFogoChain(row.destChain)
    ? "inbound"
    : "outbound";

  return {
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    direction,
    sourceChain: row.sourceChain,
    destChain: row.destChain,
    token: row.token,
    amount: row.amount.toNumber(),
    amountUsd: row.amountUsd?.toNumber() ?? 0,
    sender: row.senderAddress,
    recipient: row.recipientAddress,
    status: row.status as BridgeTransfer["status"],
    vaaId: row.operationId,
  };
}

/** Wormhole chain ID → human-readable name */
const WORMHOLE_CHAIN_NAMES: Record<number, string> = {
  1: "Solana", 2: "Ethereum", 3: "Terra", 4: "BSC", 5: "Polygon",
  6: "Avalanche", 7: "Oasis", 10: "Fantom", 13: "Klaytn", 14: "Celo",
  16: "Moonbeam", 21: "Sui", 22: "Aptos", 23: "Arbitrum", 24: "Optimism",
  28: "XPLA", 30: "Base", 32: "Sei", 34: "Scroll", 36: "Mantle",
  40: "Cosmos", 43: "Injective", 48: "Celestia", 51: "Fogo",
};

function resolveChainName(name: string | undefined, id: number): string {
  if (name && name !== "undefined" && name !== "null") return name;
  return WORMHOLE_CHAIN_NAMES[id] ?? `Chain ${id}`;
}

/** Map a Wormholescan transfer to the API response shape. */
function mapWormholeTransfer(
  wt: WormholeTransfer,
  direction: "inbound" | "outbound"
): BridgeTransfer {
  return {
    id: wt.id,
    timestamp: wt.timestamp,
    direction,
    sourceChain: resolveChainName(wt.sourceChainName, wt.emitterChain),
    destChain: resolveChainName(wt.targetChainName, wt.targetChain),
    token: "UNKNOWN",
    amount: parseFloat(wt.tokenAmount ?? "0"),
    amountUsd: parseFloat(wt.usdAmount ?? "0"),
    sender: wt.emitterAddress,
    recipient: "",
    status: (wt.status === "completed" || wt.status === "failed" || wt.status === "pending"
      ? wt.status
      : "completed") as BridgeTransfer["status"],
    vaaId: wt.id,
  };
}

/** Build the BridgeSummary from a list of mapped transfers, using raw SQL aggregations. */
async function buildSummary(transfers: BridgeTransfer[], fromDb: boolean): Promise<BridgeSummary> {
  let inflow24h: number;
  let outflow24h: number;

  if (fromDb) {
    // Use efficient raw SQL for aggregations
    const inflowResult = await prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM("amountUsd"), 0)::float AS total
      FROM "BridgeTransfer"
      WHERE "timestamp" > NOW() - INTERVAL '24 hours'
        AND ("destChain" = 'Fogo' OR "destChain" = '51')
    `;

    const outflowResult = await prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM("amountUsd"), 0)::float AS total
      FROM "BridgeTransfer"
      WHERE "timestamp" > NOW() - INTERVAL '24 hours'
        AND ("sourceChain" = 'Fogo' OR "sourceChain" = '51')
    `;

    inflow24h = Number(inflowResult[0].total);
    outflow24h = Number(outflowResult[0].total);
  } else {
    // Compute from in-memory transfers (fallback / Wormholescan data)
    inflow24h = transfers
      .filter((t) => t.direction === "inbound")
      .reduce((sum, t) => sum + t.amountUsd, 0);

    outflow24h = transfers
      .filter((t) => t.direction === "outbound")
      .reduce((sum, t) => sum + t.amountUsd, 0);
  }

  const netFlow = +(inflow24h - outflow24h).toFixed(2);
  inflow24h = +inflow24h.toFixed(2);
  outflow24h = +outflow24h.toFixed(2);

  let avgTransferSize: number;
  let uniqueAddresses: number;

  if (fromDb) {
    // Use raw SQL for accurate stats across ALL transfers, not just the 100 returned
    const statsResult = await prisma.$queryRaw<[{ avg_size: number; unique_addrs: number }]>`
      SELECT
        COALESCE(AVG("amountUsd"), 0)::float AS avg_size,
        (COUNT(DISTINCT "senderAddress") + COUNT(DISTINCT "recipientAddress"))::int AS unique_addrs
      FROM "BridgeTransfer"
      WHERE "timestamp" > NOW() - INTERVAL '24 hours'
        AND "amountUsd" > 0
    `;
    avgTransferSize = +(statsResult[0]?.avg_size ?? 0).toFixed(2);
    uniqueAddresses = statsResult[0]?.unique_addrs ?? 0;
  } else {
    const totalUsd = transfers.reduce((sum, t) => sum + t.amountUsd, 0);
    avgTransferSize = transfers.length > 0 ? +(totalUsd / transfers.length).toFixed(2) : 0;
    const addressSet = new Set<string>();
    for (const t of transfers) {
      if (t.sender) addressSet.add(t.sender);
      if (t.recipient) addressSet.add(t.recipient);
    }
    uniqueAddresses = addressSet.size;
  }

  // Group flows by the "other" chain (not Fogo)
  let flowByChain: { chain: string; inflow: number; outflow: number }[];

  if (fromDb) {
    const flowRows = await prisma.$queryRaw<{ chain: string; inflow: number; outflow: number }[]>`
      SELECT
        chain,
        COALESCE(SUM(inflow), 0)::float AS inflow,
        COALESCE(SUM(outflow), 0)::float AS outflow
      FROM (
        SELECT "sourceChain" AS chain, "amountUsd"::float AS inflow, 0::float AS outflow
        FROM "BridgeTransfer"
        WHERE "timestamp" > NOW() - INTERVAL '24 hours' AND ("destChain" = 'Fogo' OR "destChain" = '51')
        UNION ALL
        SELECT "destChain" AS chain, 0::float AS inflow, "amountUsd"::float AS outflow
        FROM "BridgeTransfer"
        WHERE "timestamp" > NOW() - INTERVAL '24 hours' AND ("sourceChain" = 'Fogo' OR "sourceChain" = '51')
      ) sub
      GROUP BY chain
      ORDER BY (SUM(inflow) + SUM(outflow)) DESC
    `;
    flowByChain = flowRows.map((r) => ({
      chain: r.chain,
      inflow: +Number(r.inflow).toFixed(2),
      outflow: +Number(r.outflow).toFixed(2),
    }));
  } else {
    const chainMap = new Map<string, { inflow: number; outflow: number }>();
    for (const t of transfers) {
      const otherChain = t.direction === "inbound" ? t.sourceChain : t.destChain;
      const entry = chainMap.get(otherChain) ?? { inflow: 0, outflow: 0 };
      if (t.direction === "inbound") {
        entry.inflow += t.amountUsd;
      } else {
        entry.outflow += t.amountUsd;
      }
      chainMap.set(otherChain, entry);
    }
    flowByChain = Array.from(chainMap.entries()).map(([chain, flow]) => ({
      chain,
      inflow: +flow.inflow.toFixed(2),
      outflow: +flow.outflow.toFixed(2),
    }));
  }

  return {
    inflow24h,
    outflow24h,
    netFlow,
    avgTransferSize,
    uniqueAddresses,
    transfers,
    flowByChain,
  };
}

async function fetchBridgeData(): Promise<BridgeSummary> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 1. Try the database first
  const dbRows = await prisma.bridgeTransfer.findMany({
    where: { timestamp: { gte: twentyFourHoursAgo } },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  if (dbRows.length > 0) {
    const transfers = dbRows.map(mapDbRow);
    return buildSummary(transfers, true);
  }

  // 2. Fallback: fetch live data from Wormholescan
  const [inbound, outbound] = await Promise.all([
    getInboundTransfers(50),
    getOutboundTransfers(50),
  ]);

  // Deduplicate: same VAA can appear in both inbound and outbound queries.
  // Use the correct direction based on whether targetChain is Fogo.
  const seen = new Set<string>();
  const allWormhole: BridgeTransfer[] = [];
  for (const wt of inbound) {
    if (!seen.has(wt.id)) {
      seen.add(wt.id);
      allWormhole.push(mapWormholeTransfer(wt, "inbound"));
    }
  }
  for (const wt of outbound) {
    if (!seen.has(wt.id)) {
      seen.add(wt.id);
      allWormhole.push(mapWormholeTransfer(wt, "outbound"));
    }
  }

  const transfers = allWormhole.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return buildSummary(transfers, false);
}

export async function GET(_request: NextRequest) {
  try {
    const data = await getOrFetch<BridgeSummary>(
      "api:bridge",
      CacheTier.AGGREGATED,
      fetchBridgeData
    );
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API] /api/bridge error:", err);
    return NextResponse.json(
      { error: "Failed to fetch bridge data" },
      { status: 500 }
    );
  }
}
