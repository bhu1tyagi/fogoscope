import { toast } from "sonner";

export const notify = {
  trade(pair: string, amountUsd: number) {
    toast(`New trade: ${pair}`, {
      description: `$${amountUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} executed`,
      duration: 4000,
    });
  },

  mev(type: string, severity: "low" | "medium" | "high") {
    const method = severity === "high" ? toast.error : severity === "medium" ? toast.warning : toast.info;
    method(`MEV Detected: ${type.replace("_", " ")}`, {
      description: `Severity: ${severity}`,
      duration: 6000,
    });
  },

  bridge(amountUsd: number, chain: string, direction: "inbound" | "outbound") {
    toast.info("Large bridge transfer", {
      description: `$${amountUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${direction} from ${chain}`,
      duration: 5000,
    });
  },

  copied() {
    toast.success("Copied to clipboard!");
  },

  speedTest(ms: number) {
    if (ms < 100) {
      toast.success(`Speed test: ${ms.toFixed(0)}ms to Fogo`);
    } else if (ms < 300) {
      toast(`Speed test: ${ms.toFixed(0)}ms to Fogo`);
    } else {
      toast.warning(`Speed test: ${ms.toFixed(0)}ms — high latency`);
    }
  },

  error(what: string) {
    toast.error(`Failed to fetch ${what}`, {
      description: "Retrying...",
      duration: 3000,
    });
  },
};
