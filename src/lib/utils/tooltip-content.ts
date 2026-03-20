export const METRIC_TOOLTIPS = {
  // Dashboard
  executionScore:
    "Composite score (0-100) based on: slippage (30%), MEV exposure (25%), latency (20%), reliability (15%), cost (10%). Higher = better execution quality.",
  avgSlippage:
    "Average difference between expected and actual trade output in basis points (1 bps = 0.01%). Lower is better. Calculated from all trades in the last 24 hours.",
  mevDetected:
    "Number of suspected MEV events (sandwich attacks, frontrunning) detected in the last 24 hours. Zero = fair execution.",
  blockTime:
    "Average time between consecutive blocks on Fogo. Target is ~40ms. Lower means faster transaction confirmation.",
  volume24h:
    "Total USD value of all DEX trades on Fogo in the last 24 hours.",
  fogoVsSolana:
    "Compares Fogo's block confirmation time (~40ms) against Solana's (~400ms). Shows the percentage speed advantage based on live RPC data.",

  // Execution
  medianSlippage:
    "The 50th percentile slippage — half of all trades had slippage below this value. More representative than average.",
  p95Slippage:
    "95th percentile slippage — only 5% of trades experience slippage above this value. Indicates worst-case typical execution.",
  totalTrades:
    "Total number of DEX trades tracked in the selected time period.",
  avgSlippageExec:
    "Average slippage across all trades in the selected time window. Measured in basis points.",

  // MEV
  mevScore:
    "MEV protection score (0-100). 100 = zero harmful MEV detected. Decreases based on number and severity of MEV events.",
  sandwichCount:
    "Sandwich attacks place trades before AND after a victim's trade to profit from price impact. Fogo's fair ordering prevents this.",
  frontrunCount:
    "Frontrunning inserts a transaction before a known pending trade. Fogo's architecture makes this structurally difficult.",
  arbitrageCount:
    "Cross-DEX arbitrage events. Some arbitrage is healthy; harmful arbitrage exploits stale prices.",
  mevExposure:
    "Percentage of all trades affected by any form of MEV extraction.",

  // Network
  currentTps:
    "Transactions per second currently being processed by the Fogo network.",
  validators:
    "Number of active validators in Fogo's curated validator set.",
  epoch:
    "Current epoch number. Validators rotate leader schedules each epoch.",
  currentSlot:
    "The most recently confirmed slot (block height) on the Fogo chain.",
  networkBlockTime:
    "Average time between blocks. Fogo targets ~40ms for ultra-fast finality.",

  // Bridge
  inflow:
    "Total USD value of assets bridged into Fogo in the last 24 hours via Wormhole.",
  outflow:
    "Total USD value of assets bridged out of Fogo in the last 24 hours.",
  netFlow:
    "Inflows minus outflows. Positive = more capital flowing into Fogo; negative = more flowing out.",
  avgTransferSize:
    "Average USD value per bridge transfer in the current time window.",
  uniqueAddresses:
    "Number of distinct wallet addresses that used the bridge in this period.",

  // Compare
  confirmationTime:
    "Time from transaction submission to on-chain finality. Fogo uses SVM with fair ordering for faster confirmation.",
  txSuccessRate:
    "Percentage of submitted transactions that execute successfully without reverting.",
  priorityFee:
    "Average priority fee paid by traders. Fogo's fair ordering reduces priority fee bidding wars.",

  // Wallet
  walletExecScore:
    "This wallet's execution quality score based on trade history — slippage, session usage, and DEX choice.",
  sessionUsage:
    "Percentage of trades executed via Fogo Sessions, which provide MEV protection and guaranteed execution.",
  preferredDex:
    "The DEX where this wallet executes the most trades by volume.",
  totalVolume:
    "Total USD value of all trades executed by this wallet.",
  bestSlippage:
    "The lowest slippage this wallet has experienced on any single trade. Lower is better.",
  worstSlippage:
    "The highest slippage this wallet has experienced. Indicates worst execution quality moment.",
} as const;
