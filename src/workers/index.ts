import { BlockMonitor } from "./block-monitor";
import { PriceCollector } from "./price-collector";
import { BridgeMonitor } from "./bridge-monitor";
import { TradeCollector } from "./trade-collector";
import { MEVDetector } from "./mev-detector";

const workers = [
  new BlockMonitor(),
  new PriceCollector(),
  new BridgeMonitor(),
  new TradeCollector(),
  new MEVDetector(),
];

console.log("FogoScope Workers starting...");
console.log(`Launching ${workers.length} workers`);

function shutdown() {
  console.log("\nShutting down workers...");
  workers.forEach((w) => w.stop());
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

workers.forEach((w) => w.start());
