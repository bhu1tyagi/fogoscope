import { BaseWorker } from "./base-worker";
import {
  getInboundTransfers,
  getOutboundTransfers,
  type WormholeTransfer,
} from "../lib/external/wormholescan";
import { prisma } from "../lib/db/prisma";

/** Wormhole chain ID → human-readable name */
const WORMHOLE_CHAIN_NAMES: Record<number, string> = {
  1: "Solana", 2: "Ethereum", 3: "Terra", 4: "BSC", 5: "Polygon",
  6: "Avalanche", 7: "Oasis", 8: "Algorand", 10: "Fantom", 12: "Acala",
  13: "Klaytn", 14: "Celo", 16: "Moonbeam", 19: "Osmosis",
  21: "Sui", 22: "Aptos", 23: "Arbitrum", 24: "Optimism",
  28: "XPLA", 30: "Base", 32: "Sei", 34: "Scroll", 36: "Mantle",
  40: "Cosmos", 43: "Injective", 47: "Near", 48: "Celestia",
  50: "Blast", 51: "Fogo", 59: "Berachain",
};

function resolveChainName(name: string | undefined, id: number | undefined): string {
  if (name && name !== "undefined" && name !== "null") return name;
  if (id != null && WORMHOLE_CHAIN_NAMES[id]) return WORMHOLE_CHAIN_NAMES[id];
  if (id != null) return `Chain ${id}`;
  return "Unknown";
}

/**
 * Polls Wormholescan every 30 seconds for recent bridge transfers
 * to/from Fogo and upserts them into the BridgeTransfer table.
 */
export class BridgeMonitor extends BaseWorker {
  name = "BridgeMonitor";
  intervalMs = 30_000;

  async execute(): Promise<void> {
    // 1. Fetch inbound and outbound transfers in parallel
    const [inbound, outbound] = await Promise.all([
      getInboundTransfers(20),
      getOutboundTransfers(20),
    ]);

    // Tag transfers with direction since Wormholescan often returns null for targetChain
    const taggedInbound = inbound.map((t) => ({ ...t, _direction: "inbound" as const }));
    const taggedOutbound = outbound.map((t) => ({ ...t, _direction: "outbound" as const }));
    const allTransfers = [...taggedInbound, ...taggedOutbound];

    console.log(
      `[${this.name}] Found ${inbound.length} inbound + ${outbound.length} outbound = ${allTransfers.length} transfers`
    );

    if (allTransfers.length === 0) return;

    // 2. Upsert each transfer to DB (best-effort)
    let written = 0;
    let skipped = 0;

    for (const transfer of allTransfers) {
      try {
        await prisma.bridgeTransfer.upsert({
          where: { operationId: transfer.id },
          update: {
            status: transfer.status ?? "completed",
          },
          create: {
            operationId: transfer.id,
            timestamp: new Date(transfer.timestamp),
            sourceChain: transfer._direction === "inbound"
              ? resolveChainName(transfer.sourceChainName, transfer.emitterChain)
              : "Fogo",
            destChain: transfer._direction === "inbound"
              ? "Fogo"
              : resolveChainName(transfer.targetChainName, transfer.targetChain),
            token: "unknown", // Wormholescan doesn't always provide the token symbol inline
            amount: parseFloat(transfer.tokenAmount ?? "0") || 0,
            amountUsd: transfer.usdAmount
              ? parseFloat(transfer.usdAmount) || null
              : null,
            senderAddress: transfer.emitterAddress,
            recipientAddress: "", // not available from this endpoint
            status: transfer.status ?? "completed",
          },
        });
        written++;
      } catch (err) {
        skipped++;
        // Duplicate key or DB offline — log once and continue
        if (skipped === 1) {
          console.error(`[${this.name}] DB upsert failed (showing first):`, err);
        }
      }
    }

    console.log(
      `[${this.name}] Upserted ${written} transfers, skipped ${skipped}`
    );
  }
}
