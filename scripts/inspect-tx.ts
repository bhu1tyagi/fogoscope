import { Connection, PublicKey } from "@solana/web3.js";

const conn = new Connection("https://mainnet.fogo.io", "confirmed");

// Check router program + specific pair addresses
const targets = [
  { name: "VALIANT_ROUTER", addr: "vnt1u7PzorND5JjweFWmDawKe2hLWoTwHU6QKz6XX98" },
  { name: "FOGO/USDC.s pair", addr: "J7mxBLSz51Tcbog3XsiJTAXS64N46KqbpRGQmd3dQMKp" },
  { name: "stFOGO/FOGO pair", addr: "Be2eoA9g1Yp8WKqMM14tXjSHuYCudaPpaudLTmC4gizp" },
  { name: "iFOGO/FOGO pair", addr: "HULdR8aMSxJAiNJmrTBcfKN4Zq6FgG33AHbQ3nDD8P5E" },
  { name: "iHUB/FOGO pair", addr: "Ehd5SgBc1UmnXzftJrsiKc4hu8nQ6PumiXoaEEs2znQS" },
];

async function main() {
  for (const target of targets) {
    console.log(`\n=== ${target.name}: ${target.addr} ===`);
    const pubkey = new PublicKey(target.addr);
    const sigs = await conn.getSignaturesForAddress(pubkey, { limit: 10 });
    console.log(`Found ${sigs.length} recent signatures`);

    // Look at first few that have token balance changes
    let swapFound = 0;
    for (const s of sigs.slice(0, 10)) {
      const tx = await conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
      if (!tx?.meta) continue;

      const pre = tx.meta.preTokenBalances ?? [];
      const post = tx.meta.postTokenBalances ?? [];
      const logs = tx.meta.logMessages ?? [];
      const ixLogs = logs.filter(l => l.includes("Instruction:"));

      if (pre.length > 0 || post.length > 0) {
        swapFound++;
        console.log(`\n  TX: ${s.signature.slice(0, 40)}...`);
        console.log(`  Slot: ${tx.slot} | Err: ${tx.meta.err}`);
        console.log(`  Instructions: ${ixLogs.join(", ")}`);
        console.log(`  preTokenBalances: ${pre.length} | postTokenBalances: ${post.length}`);

        // Balance changes
        const changes = new Map<string, { mint: string; owner: string; pre: number; post: number }>();
        for (const b of pre) {
          const key = `${b.owner}:${b.mint}`;
          changes.set(key, { mint: b.mint, owner: b.owner ?? "", pre: parseFloat(b.uiTokenAmount.uiAmountString ?? "0"), post: 0 });
        }
        for (const b of post) {
          const key = `${b.owner}:${b.mint}`;
          const existing = changes.get(key) ?? { mint: b.mint, owner: b.owner ?? "", pre: 0, post: 0 };
          existing.post = parseFloat(b.uiTokenAmount.uiAmountString ?? "0");
          changes.set(key, existing);
        }
        for (const [, v] of changes) {
          const diff = v.post - v.pre;
          if (Math.abs(diff) > 0.000001) {
            console.log(`    Δ owner:${v.owner?.slice(0,20)}... mint:${v.mint} ${diff > 0 ? "+" : ""}${diff}`);
          }
        }

        // Show programs
        const msg = tx.transaction.message;
        const keys = msg.getAccountKeys({ accountKeysFromLookups: tx.meta.loadedAddresses ?? undefined });
        const programs = new Set<string>();
        for (const ix of msg.compiledInstructions) {
          programs.add(keys.get(ix.programIdIndex)?.toBase58() ?? "?");
        }
        console.log(`  Programs: ${[...programs].join(", ")}`);

        if (swapFound >= 3) break;
      }
    }

    if (swapFound === 0) {
      // Show what types of instructions are happening
      for (const s of sigs.slice(0, 3)) {
        const tx = await conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
        if (!tx?.meta) continue;
        const logs = tx.meta.logMessages ?? [];
        const ixLogs = logs.filter(l => l.includes("Instruction:"));
        console.log(`  ${s.signature.slice(0, 30)}... => ${ixLogs.join(", ")}`);
      }
    }
  }
}

main().catch(console.error);
