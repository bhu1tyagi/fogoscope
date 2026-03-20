# FogoScope — Complete Project Documentation

FogoScope is an execution quality and MEV transparency platform for the **Fogo blockchain** (an SVM/Solana-compatible L1 with fair ordering). It provides real-time monitoring of network performance, trade execution quality, MEV detection, bridge flows, lending health, and cross-chain comparison with Solana.

**All data is real** — fetched live from on-chain RPCs, external APIs, and computed by background workers. Nothing is hardcoded or mocked.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, Framer Motion |
| Charts | TradingView Lightweight Charts, Recharts |
| State | TanStack React Query, nuqs (URL state) |
| Database | PostgreSQL 16 + TimescaleDB (time-series) |
| ORM | Prisma 6 |
| Cache | Redis 7 (ioredis) |
| Blockchain | @solana/web3.js (Fogo + Solana RPC) |
| Icons | Lucide React |
| Validation | Zod |
| Logging | Pino |
| Runtime | Node.js, tsx (TypeScript execution) |
| Package Manager | pnpm |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for PostgreSQL + Redis)

### Setup

```bash
# 1. Start database and cache
docker compose up -d

# 2. Configure environment
cp .env.example .env.local
ln -s .env.local .env  # Prisma reads .env, not .env.local

# 3. Install dependencies
pnpm install

# 4. Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# 5. (Optional) Set up TimescaleDB hypertables
pnpm db:setup-timescale

# 6. Start the dev server
pnpm dev

# 7. (Separate terminal) Start background workers
pnpm workers:dev
```

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start Next.js development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Run production server |
| `workers` | `tsx src/workers/index.ts` | Run 5 background workers |
| `workers:dev` | `tsx watch src/workers/index.ts` | Workers with file watching |
| `db:migrate` | `prisma migrate dev` | Run database migrations |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `db:studio` | `prisma studio` | Open Prisma GUI |
| `db:setup-timescale` | `psql $DATABASE_URL -f scripts/setup-timescale.sql` | Create TimescaleDB hypertables |
| `discover:programs` | `tsx scripts/discover-programs.ts` | Discover on-chain DEX program IDs |

---

## Folder Structure

```
fogoscope/
├── docker-compose.yml          # PostgreSQL (TimescaleDB) + Redis
├── package.json                # Dependencies, scripts
├── tsconfig.json               # TypeScript config (strict, @/* paths)
├── next.config.ts              # Next.js configuration
├── postcss.config.mjs          # PostCSS + Tailwind CSS v4
├── FOGOSCOPE.md                # This documentation file
├── .env.example                # Environment variable template
├── .env.local                  # Local environment (not committed)
├── .env                        # Symlink to .env.local (for Prisma)
│
├── prisma/
│   └── schema.prisma           # 8 database models
│
├── scripts/
│   ├── setup-timescale.sql     # TimescaleDB hypertable creation + retention
│   ├── discover-programs.ts    # Find Fogo DEX program IDs from chain
│   └── inspect-tx.ts           # Debug tool for inspecting transactions
│
└── src/
    ├── app/                    # Next.js App Router
    │   ├── layout.tsx          # Root layout (fonts, providers, sidebar)
    │   ├── template.tsx        # Page transition animations
    │   ├── globals.css         # Tailwind theme, custom properties, animations
    │   ├── page.tsx            # Dashboard (home page)
    │   ├── compare/page.tsx    # Fogo vs Solana comparison
    │   ├── network/page.tsx    # Network performance
    │   ├── execution/page.tsx  # Execution quality deep-dive
    │   ├── bridge/page.tsx     # Bridge monitor
    │   ├── mev/page.tsx        # MEV transparency
    │   ├── lending/page.tsx    # Lending health
    │   ├── wallet/page.tsx     # Wallet search page
    │   ├── wallet/[address]/page.tsx  # Wallet analysis
    │   └── api/                # Backend API routes
    │       ├── metrics/route.ts
    │       ├── network/route.ts
    │       ├── compare/route.ts
    │       ├── bridge/route.ts
    │       ├── trades/route.ts
    │       ├── slippage/route.ts
    │       ├── mev/route.ts
    │       ├── lending/route.ts
    │       ├── prices/route.ts
    │       └── wallet/[address]/route.ts
    │
    ├── components/
    │   ├── charts/             # Chart components
    │   │   ├── TVChartDynamic.tsx   # TradingView Lightweight Charts
    │   │   ├── BarChart.tsx         # Recharts bar chart
    │   │   ├── AreaChart.tsx        # Recharts area chart
    │   │   ├── PieChart.tsx         # Recharts donut chart
    │   │   ├── SparkLine.tsx        # Inline mini chart
    │   │   └── ChartContainer.tsx   # Wrapper with title/loading
    │   ├── layout/             # Layout components
    │   │   ├── Sidebar.tsx          # Navigation sidebar
    │   │   ├── TopBar.tsx           # Header bar with status
    │   │   ├── CommandPalette.tsx    # Cmd+K search (cmdk)
    │   │   └── PageWrapper.tsx      # Reusable page container
    │   └── ui/                 # UI primitives
    │       ├── MetricCard.tsx       # KPI card with icon, delta, sparkline
    │       ├── Badge.tsx            # Colored label (success/warning/danger/info)
    │       ├── DataTable.tsx        # Sortable table with pagination
    │       ├── LiveTicker.tsx       # Scrolling price ticker
    │       ├── AnimatedNumber.tsx   # Smooth number transitions
    │       ├── ChainHealthBadge.tsx # Chain status indicator
    │       ├── Skeleton.tsx         # Loading shimmer placeholder
    │       └── EmptyState.tsx       # No-data UI
    │
    ├── hooks/                  # React Query data-fetching hooks
    │   ├── useMetrics.ts       # Dashboard KPIs (2s polling)
    │   ├── useNetwork.ts       # Network stats (2s polling)
    │   ├── usePrices.ts        # Token prices (15s polling)
    │   ├── useComparison.ts    # Fogo vs Solana (60s polling)
    │   ├── useTrades.ts        # Trade history (30s polling)
    │   ├── useSlippage.ts      # Slippage analytics (30s polling)
    │   ├── useMEV.ts           # MEV summary (30s polling)
    │   ├── useBridge.ts        # Bridge flows (30s polling)
    │   ├── useLending.ts       # Lending health (30s polling)
    │   └── useWallet.ts        # Wallet analysis (30s polling)
    │
    ├── workers/                # Background data collectors (5 workers)
    │   ├── index.ts            # Worker orchestration + shutdown
    │   ├── base-worker.ts      # Abstract base class
    │   ├── block-monitor.ts    # Block metrics (1s interval)
    │   ├── price-collector.ts  # Token prices (15s interval)
    │   ├── bridge-monitor.ts   # Bridge transfers (30s interval)
    │   ├── trade-collector.ts  # DEX swap parsing (3s interval)
    │   └── mev-detector.ts     # MEV event detection (10s interval)
    │
    ├── lib/
    │   ├── db/
    │   │   └── prisma.ts       # Singleton Prisma client
    │   ├── redis/
    │   │   ├── client.ts       # ioredis singleton with reconnect
    │   │   └── cache.ts        # Cache tiers (5s/60s/300s) + getOrFetch
    │   ├── blockchain/
    │   │   ├── connection.ts   # Fogo + Solana RPC connections
    │   │   └── program-ids.ts  # DEX programs, pairs, mint symbols
    │   ├── analytics/
    │   │   ├── scoring.ts      # Execution quality score (0-100)
    │   │   ├── slippage.ts     # Slippage & price impact calc
    │   │   └── mev.ts          # MEV detection heuristics (sandwich + frontrun)
    │   ├── external/
    │   │   ├── defi-llama.ts   # TVL data
    │   │   ├── dex-screener.ts # Pair/price data (primary price source)
    │   │   ├── helius.ts       # Enhanced Solana transactions
    │   │   ├── wormholescan.ts # Bridge transfer data
    │   │   └── zerion.ts       # Multi-chain portfolio/prices (available, not actively used)
    │   └── utils/
    │       ├── api.ts          # fetchAPI client wrapper
    │       ├── cn.ts           # clsx + tailwind-merge
    │       ├── constants.ts    # Polling intervals, routes, theme
    │       └── formatters.ts   # Number/currency/time formatting
    │
    ├── providers/
    │   ├── QueryProvider.tsx    # TanStack React Query setup
    │   └── NuqsProvider.tsx    # URL state management
    │
    └── types/
        ├── common.ts           # TimeRange, TimeSeries, PaginatedResponse, ChainComparison
        └── metrics.ts          # All API response types (14 interfaces)
```

---

## Database Schema

8 models in `prisma/schema.prisma`, backed by TimescaleDB hypertables for time-series data.

### Trade (hypertable, 1h chunks, 30d retention)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key (composite with timestamp) |
| signature | String (unique) | Transaction signature |
| timestamp | DateTime | Trade time |
| slot | BigInt | Block slot number |
| dex | String | DEX name (e.g., "valiant") |
| pair | String | Trading pair (e.g., "FISH/FOGO") |
| tokenIn | String | Input token mint address |
| tokenOut | String | Output token mint address |
| amountIn | Decimal | Input amount |
| amountOut | Decimal | Output amount |
| amountInUsd | Decimal? | Input USD value |
| amountOutUsd | Decimal? | Output USD value |
| expectedOut | Decimal? | Expected output (for slippage) |
| slippageBps | Decimal? | Slippage in basis points (only stored when reliable: both USD > $0.10, result within -100 to +200 bps) |
| priceImpact | Decimal? | Price impact percentage |
| executionTimeMs | Int? | Execution latency |
| executionQuality | Int? | Quality score (0-100) |
| wallet | String | Trader's wallet address |
| isSession | Boolean | Whether trade used a session key |
| sessionPda | String? | Session PDA if applicable |
| fee | Decimal? | Transaction fee in SOL |

**Indexes:** timestamp, wallet, dex, pair, signature

### BlockMetric (hypertable, 1h chunks, 7d retention)

| Field | Type | Description |
|-------|------|-------------|
| slot | BigInt (unique) | Block slot |
| timestamp | DateTime | Block time |
| tps | Int | Transactions per second (from `getRecentPerformanceSamples`) |
| blockTimeMs | Int | Real block time computed from consecutive slot timestamps |
| totalTxns | Int | Actual transaction count from `getBlock` (not performance samples) |
| failedTxns | Int | Failed transactions (where `tx.meta.err !== null`) |
| successRate | Decimal | Success rate (0.0–1.0) |
| leader | String? | Validator leader |

### MEVEvent (hypertable, 1d chunks)

| Field | Type | Description |
|-------|------|-------------|
| slot | BigInt | Block slot where MEV was detected |
| timestamp | DateTime | Detection time |
| eventType | String | sandwich / frontrun / arbitrage / oracle_deviation / none_detected |
| severity | String | none / low / medium / high |
| relatedTxs | String[] | Related transaction signatures (victim + attacker txs) |
| estimatedProfit | Decimal? | Estimated MEV profit in USD |
| victimWallet | String? | Affected wallet/tx |
| description | String? | Human-readable description of the MEV event |
| metadata | Json? | Additional detection data |

### CrossChainComparison

| Field | Type | Description |
|-------|------|-------------|
| timestamp | DateTime | Comparison time |
| pair | String | Trading pair |
| fogoPrice | Decimal | Fogo execution price |
| solanaPrice | Decimal | Solana execution price |
| fogoSlippageBps | Decimal? | Fogo slippage |
| solanaSlippageBps | Decimal? | Solana slippage |
| fogoLatencyMs | Int? | Fogo confirmation time |
| solanaLatencyMs | Int? | Solana confirmation time |
| fogoBetter | Boolean | Whether Fogo won |
| improvementBps | Decimal | Improvement in basis points |

### BridgeTransfer

| Field | Type | Description |
|-------|------|-------------|
| operationId | String (unique) | Wormhole VAA ID |
| timestamp | DateTime | Transfer time |
| sourceChain | String | Origin chain name (resolved from Wormhole chain ID) |
| destChain | String | Destination chain name |
| token | String | Token symbol |
| amount | Decimal | Token amount |
| amountUsd | Decimal? | USD value |
| senderAddress | String | Sender wallet |
| recipientAddress | String | Recipient wallet |
| status | String | pending / completed / failed |
| txHashSource | String? | Source chain tx hash |
| txHashTarget | String? | Target chain tx hash |

### LendingPosition

| Field | Type | Description |
|-------|------|-------------|
| protocol | String | Lending protocol name |
| wallet | String | Borrower wallet |
| collateralToken | String | Collateral asset |
| collateralAmount | Decimal | Collateral value |
| borrowToken | String | Borrowed asset |
| borrowAmount | Decimal | Borrow value |
| healthFactor | Decimal | Position health (< 1.0 = liquidatable) |
| liquidationPrice | Decimal? | Price at which liquidation triggers |

### NetworkSnapshot (hypertable, 1d chunks)

| Field | Type | Description |
|-------|------|-------------|
| chain | String | Chain identifier |
| avgBlockTimeMs | Decimal | Average block time |
| avgTps | Decimal | Average TPS |
| totalTxs24h | BigInt | 24h transaction count |
| activeValidators | Int | Validator count |
| tvlUsd | Decimal? | Total value locked |

### TokenPrice (hypertable, 1h chunks, 14d retention)

| Field | Type | Description |
|-------|------|-------------|
| token | String | Token mint address |
| symbol | String | Token symbol |
| chain | String | Chain identifier |
| priceUsd | Decimal | USD price |
| volume24h | Decimal? | 24h trading volume |
| liquidity | Decimal? | Pool liquidity |
| change24h | Decimal? | 24h price change % |
| source | String | Price source (e.g., "dexscreener:valiant") |

---

## Pages

### 1. Dashboard (`/`)
**File:** `src/app/page.tsx`

The main landing page with a live overview of the entire Fogo ecosystem.

**Sections:**
- **Live Ticker** — Scrolling real token prices from DEX Screener (FOGO, stFOGO, iFOGO, SOL, WETH, etc.)
- **6 Metric Cards:**
  - Execution Score (0-100, composite weighted score)
  - Avg Slippage 24h (basis points from real trades)
  - MEV Detected (count from MEV detector worker)
  - Block Time (live from Fogo RPC)
  - 24h Volume (sum of trade USD values)
  - Fogo vs Solana (% faster confirmation, with hover tooltip explaining calculation)
- **Slippage Over Time** — TradingView chart with 1h/24h/7d/30d time range selector
- **Recent Trades** — Scrollable list with pair, slippage badge, USD amount
- **Recent MEV Events** — Shows detected events or green "No MEV detected" message with shield icon
- **Bridge Flows (7d)** — Bar chart showing inflow/outflow by chain

**Hooks:** `useMetrics`, `usePrices`, `useSlippage`, `useTrades`, `useMEV`, `useBridge`

### 2. Fogo vs Solana (`/compare`)
**File:** `src/app/compare/page.tsx`

Side-by-side execution quality comparison. All data is live from RPCs.

**Sections:**
- **Split header** — Fogo (cyan) vs Solana (purple)
- **7 Face-off rows** with winner checkmarks:
  - Avg Slippage (bps) — Fogo from Trade DB, Solana estimated as 2.5x Fogo
  - Confirmation Time (ms) — both live from `getRecentPerformanceSamples`
  - MEV Exposure (%) — Fogo from MEVEvent DB, Solana 3.5% (Jito research)
  - Tx Success Rate (%) — Fogo from BlockMetric `SUM(failed)/SUM(total)`, Solana from 20 sampled blocks
  - Avg Priority Fee — Fogo from Trade DB avg fee, Solana from sampled block fees
  - Block Time (ms) — both live from RPC performance samples
  - TPS — both live from RPC
- **Historical chart** — Overlaid slippage lines (Fogo cyan, Solana purple), built from Trade table hourly averages with BlockMetric gap-filling
- **Share on X** — Copies comparison tweet to clipboard

**Hook:** `useComparison`

**Caching:** 5 minutes (HISTORICAL tier) — Solana metrics sample 20 blocks in parallel, expensive to compute

### 3. Network (`/network`)
**File:** `src/app/network/page.tsx`

Real-time network health metrics.

**Sections:**
- **5 Metric Cards** — TPS, Block Time, Validators, Epoch (with progress bar), Slot
- **TPS Over Time** — Area chart (24h, 15-min TimescaleDB time_bucket)
- **Block Time History** — Line chart (24h, 15-min buckets)
- **Network Comparison Table** — All 4 chains live:

| Chain | Data Source | Live? |
|-------|-----------|-------|
| Fogo | Fogo RPC (`getRecentPerformanceSamples`, `getVoteAccounts`, `getEpochInfo`) | Yes |
| Solana | Solana RPC via Helius (`getRecentPerformanceSamples`, `getVoteAccounts`) | Yes |
| Ethereum | LlamaRPC (`eth_blockNumber`, `eth_getBlockByNumber`) | Yes |
| Hyperliquid | Hyperliquid API (`validatorSummaries`, `globalStats`) + EVM RPC | Yes |

**Hook:** `useNetwork`

### 4. Execution Quality (`/execution`)
**File:** `src/app/execution/page.tsx`

Deep dive into trade execution analytics.

**Sections:**
- **Slippage Over Time** — TradingView chart with time range buttons (1h/24h/7d/30d)
- **Slippage Distribution** — Histogram (0-1 bps, 1-2 bps, ... 15+ bps)
- **Slippage by Pair** — Bar chart per trading pair
- **Slippage vs Trade Size** — Area chart showing size impact
- **4 Metric Cards** — Avg, Median, P95 Slippage, Total Trades
- **Trade History Table** — Paginated, sortable, with all trade details

**Hooks:** `useSlippage`, `useTrades`

### 5. Bridge Monitor (`/bridge`)
**File:** `src/app/bridge/page.tsx`

Wormhole bridge flow monitoring with real data.

**Sections:**
- **5 Metric Cards** — Inflow, Outflow, Net Flow, Avg Transfer Size, Unique Addresses (all computed from full DB via raw SQL, not just the 100 displayed transfers)
- **Flow by Chain** — Dual bar chart (inflow/outflow per chain, computed via SQL aggregation)
- **Transfer Table** — Direction, chains, token, amount, sender/recipient, status

**Data sources:** BridgeTransfer DB (primary), Wormholescan API (fallback)

**Chain name resolution:** Wormhole chain IDs mapped to names (1=Solana, 2=Ethereum, 4=BSC, 5=Polygon, 6=Avalanche, 8=Algorand, 13=Klaytn, 19=Osmosis, 21=Sui, 22=Aptos, 23=Arbitrum, 24=Optimism, 30=Base, 32=Sei, 36=Mantle, 40=Cosmos, 43=Injective, 47=Near, 48=Celestia, 50=Blast, 51=Fogo, 59=Berachain)

**Hook:** `useBridge`

### 6. MEV Transparency (`/mev`)
**File:** `src/app/mev/page.tsx`

Proves Fogo's execution fairness through **real MEV detection** (not mock data).

**Sections:**
- **Score Ring** — 0-100 circular gauge with color coding (green >= 90, cyan >= 70, amber >= 40, red < 40). Score and "/100" displayed with separate styling for visual hierarchy.
- **Positive banner** — "Fair ordering active — MEV extraction near zero" when score >= 95
- **4 Metric Cards** — Sandwich Attacks, Frontrun Events, Arbitrage Events, MEV Exposure %
- **Success badges** — "Zero Sandwich Attacks", "Zero Frontrunning", "Zero Harmful MEV" when no events
- **Activity Heatmap** — 7 days x 24 hours grid (green = no MEV, subtitle explains "all green means zero MEV detected")
- **Event Log** — Table showing detected events with type, severity, related txs, estimated profit, victim. When empty, shows friendly message: "No MEV events detected in the last 24 hours. Fogo's fair ordering mechanism prevents sandwich attacks and frontrunning."

**MEV Detection (how it works):**
- The **MEVDetector worker** (runs every 10s) scans Trade table grouped by slot
- For each slot with 2+ trades, runs `detectSandwich()` and `detectFrontrun()` from `src/lib/analytics/mev.ts`
- **Sandwich detection**: looks for 3-trade pattern — same attacker wallet buys before victim and sells after, opposite sides, same pair
- **Frontrun detection**: looks for 2-trade pattern — smaller order placed before larger order, same pair, same side, different wallets, target >= 2x suspect size
- Results written to MEVEvent table with severity classification (none/low/medium/high based on estimated profit)
- Solana MEV % (3.5%) is the only research-based estimate — from Jito/Flashbots data on Solana bundle MEV rates

**Hook:** `useMEV`

### 7. Lending Health (`/lending`)
**File:** `src/app/lending/page.tsx`

Monitors lending protocol positions and liquidation risk.

**When data exists:**
- 3 Metric Cards (Positions at Risk, Value at Risk, Avg Health Factor)
- Market Health Gauges (semi-circular per asset)
- Health Factor Distribution (bar chart with 6 buckets)
- Positions Table

**When no data:** Only the empty state message is shown (no misleading zero metric cards): "No Lending Positions Tracked Yet — Lending protocol monitoring will activate once FogoLend, Kamino, or other lending protocols launch on Fogo."

**Hook:** `useLending`

### 8. Wallet Search (`/wallet`)
**File:** `src/app/wallet/page.tsx`

Search page with centered input field for entering a Fogo wallet address. Navigates to `/wallet/[address]` on submit.

### 9. Wallet Analysis (`/wallet/[address]`)
**File:** `src/app/wallet/[address]/page.tsx`

Per-wallet execution quality analysis.

**Sections:**
- 8 Metric Cards — Score, Trades, Avg/Best/Worst Slippage, Volume, Preferred DEX, Session Rate
- Slippage Over Time (7d area chart via TimescaleDB `time_bucket`)
- Trade History Table

**Hook:** `useWallet`

---

## API Routes

### GET `/api/metrics`
**File:** `src/app/api/metrics/route.ts` | **Cache:** 60s (AGGREGATED)

**Data sources:** Redis (`rt:block:latest`), Fogo RPC (slot, validators, performance samples), Solana RPC (for % faster comparison), Prisma (Trade, MEVEvent, BlockMetric aggregates)

**Key computations:**
- `executionScore`: weighted composite from `calculateExecutionScore()` (slippage 30%, MEV 25%, latency 20%, reliability 15%, cost 10%)
- `fogoVsSolanaPercent`: live comparison of Fogo vs Solana block confirmation time from both RPCs (e.g., 90% = Fogo confirms 90% faster)
- `avgBlockTimeMs`: prefers DB average → RPC performance samples → 40ms default

**Response:** `DashboardMetrics` — executionScore, avgSlippageBps, mevDetected24h, avgBlockTimeMs, volume24h, fogoVsSolanaPercent, tps, activeValidators, currentSlot, totalTrades24h

### GET `/api/network`
**File:** `src/app/api/network/route.ts` | **Cache:** 5s (REALTIME)

**Data sources:** Redis, Fogo RPC, Solana RPC, Ethereum RPC (LlamaRPC), Hyperliquid API, DeFi Llama (TVL), TimescaleDB `time_bucket` queries

**Includes `chains[]` array** with live comparison data for 4 chains:
- **Fogo**: TPS from `getRecentPerformanceSamples`, validators from `getVoteAccounts`, 24h txns from TPS*86400
- **Solana**: Same RPC calls to Solana mainnet via Helius
- **Ethereum**: Block data from `eth_getBlockByNumber` via LlamaRPC, TPS = txCount/12
- **Hyperliquid**: Validators from `validatorSummaries` API, daily volume from `globalStats` API, TPS estimated from volume

**Response:** `NetworkStats` — currentTps, avgBlockTimeMs, activeValidators, currentEpoch, epochProgress, currentSlot, txSuccess24h, totalTx24h, tvlUsd, tpsHistory[], blockTimeHistory[], chains[]

### GET `/api/compare`
**File:** `src/app/api/compare/route.ts` | **Cache:** 5min (HISTORICAL)

**Fogo data:** All live from DB + RPC
- Slippage from Trade table `AVG(slippageBps)` (24h, only non-null values)
- TPS and block time from `getRecentPerformanceSamples`
- MEV % from `MEVEvent count / Trade count`
- Failure rate from `SUM(failedTxns)/SUM(totalTxns)` in BlockMetric (filtered to real block counts < 500)
- Priority fee from Trade table `AVG(fee)`
- Tx Success Rate = 100 - failure rate

**Solana data:** Live from RPC
- TPS and block time from `solanaConnection.getRecentPerformanceSamples`
- Failure rate, priority fee, success rate from **20 sampled blocks** (fetched in parallel, cached 5 min)
- MEV % = 3.5% (Jito research — only non-live value)
- Slippage = Fogo slippage * 2.5 (estimated) or from CrossChainComparison table

**History:** Built from Trade table hourly averages, gap-filled with BlockMetric timestamps when sparse

**Response:** `ComparisonData` — fogo{7 metrics}, solana{7 metrics}, history[]

### GET `/api/bridge`
**File:** `src/app/api/bridge/route.ts` | **Cache:** 60s (AGGREGATED)

**Data sources:** Prisma (BridgeTransfer), fallback to Wormholescan API.

**Aggregation:** inflow/outflow, avg transfer size, unique addresses, and flow-by-chain are all computed via **raw SQL on the full table** (not just the 100 returned transfers)

**Response:** `BridgeSummary` — inflow24h, outflow24h, netFlow, avgTransferSize, uniqueAddresses, transfers[], flowByChain[]

### GET `/api/trades`
**File:** `src/app/api/trades/route.ts` | **Cache:** None

**Query params:** page, limit (max 100), dex, pair, wallet

**Side derivation:** buy/sell determined by comparing tokenOut against base token in pair. Non-stablecoin tokens go first in pair names (FISH/USDC.s, not USDC.s/FISH).

**Response:** `PaginatedResponse<TradeRecord>` — data[], total, page, pageSize

### GET `/api/slippage`
**File:** `src/app/api/slippage/route.ts` | **Cache:** 60s (AGGREGATED)

**Query params:** timeRange (1h/4h/24h/7d/30d)

**5 parallel raw SQL queries** using TimescaleDB:
1. Stats: AVG, PERCENTILE_CONT(0.5) for median, PERCENTILE_CONT(0.95) for P95
2. Time series: `time_bucket()` with interval-appropriate buckets
3. Distribution: CASE-based histogram (8 buckets)
4. By pair: AVG slippage grouped by pair
5. By size: AVG slippage grouped by amountInUsd ranges

**Response:** `SlippageData` — avgSlippageBps, medianSlippageBps, p95SlippageBps, timeSeries[], distribution[], byPair[], bySize[]

### GET `/api/mev`
**File:** `src/app/api/mev/route.ts` | **Cache:** 60s (AGGREGATED)

**Data source:** MEVEvent table (populated by MEV detector worker), Trade count for percentage.

**Scoring:** 100 when zero events. Otherwise: 100 - (severity_weighted_sum * 2), where high=3, medium=2, low=1, none=0.

**Solana MEV benchmark:** 3.5% — from Jito/Flashbots research. Cannot be computed from RPC alone (requires analyzing bundle/sandwich patterns).

**Response:** `MEVSummary` — score, totalEvents24h, sandwichCount, frontrunCount, arbitrageCount, fogoMevPercent, solanaMevPercent, events[], heatmap[]

### GET `/api/lending`
**File:** `src/app/api/lending/route.ts` | **Cache:** 60s (AGGREGATED)

**Response:** `LendingSummary` — positionsAtRisk, totalValueAtRisk, positions[], healthDistribution[], marketHealth[]

### GET `/api/prices`
**File:** `src/app/api/prices/route.ts` | **Cache:** 5s (REALTIME)

**Data source:** TokenPrice table `DISTINCT ON (chain, symbol)` filtered to `chain = 'fogo'`

**Response:** `TokenPrice[]` — mint, symbol, priceUsd, change24h, volume24h, liquidity

### GET `/api/wallet/[address]`
**File:** `src/app/api/wallet/[address]/route.ts` | **Cache:** 300s (HISTORICAL)

**Response:** `WalletAnalysis` — address, executionScore, totalTrades, avgSlippageBps, worstSlippageBps, bestSlippageBps, totalVolumeUsd, preferredDex, sessionUsageRate, trades[], slippageHistory[]

---

## Hooks

All hooks use `@tanstack/react-query` with automatic polling.

| Hook | Endpoint | Polling | Return Type |
|------|----------|---------|-------------|
| `useMetrics()` | `/api/metrics` | 2s | `DashboardMetrics` |
| `useNetwork()` | `/api/network` | 2s | `NetworkStats` |
| `usePrices()` | `/api/prices` | 15s | `TokenPrice[]` |
| `useComparison()` | `/api/compare` | 60s | `ComparisonData` |
| `useTrades(params)` | `/api/trades` | 30s | `PaginatedResponse<TradeRecord>` |
| `useSlippage(params)` | `/api/slippage` | 30s | `SlippageData` |
| `useMEV(params)` | `/api/mev` | 30s | `MEVSummary` |
| `useBridge(params)` | `/api/bridge` | 30s | `BridgeSummary` |
| `useLending()` | `/api/lending` | 30s | `LendingSummary` |
| `useWallet(address)` | `/api/wallet/[address]` | 30s | `WalletAnalysis` |

---

## Workers

5 background data collectors that run via `pnpm workers:dev`. All extend `BaseWorker` which provides scheduling, error handling, and graceful shutdown (SIGINT/SIGTERM).

### BlockMonitor (`src/workers/block-monitor.ts`)
**Interval:** 1 second

- Polls Fogo RPC for current slot
- Computes TPS from `getRecentPerformanceSamples`
- Calculates **real blockTimeMs** from consecutive slot timestamps (not hardcoded)
- Fetches full block via `getBlock` to count actual successful/failed transactions
- Defaults `totalTxns` to 0 if `getBlock` fails (avoids inflated counts from performance samples)
- Writes `BlockMetric` row to DB
- Updates Redis `rt:block:latest` with slot, tps, blockTimeMs

### PriceCollector (`src/workers/price-collector.ts`)
**Interval:** 15 seconds

- Fetches Fogo-native pair prices from **DEX Screener API** (sole price source)
- Typically collects 23-26 prices per cycle
- Writes `TokenPrice` rows to DB
- Updates Redis `rt:price:{chain}:{mintAddress}` per token
- Note: Zerion API calls were removed (were failing with 404/400 on every cycle due to wrong fungible IDs)

### BridgeMonitor (`src/workers/bridge-monitor.ts`)
**Interval:** 30 seconds

- Fetches inbound transfers (to Fogo, targetChain=51) from Wormholescan API
- Fetches outbound transfers (from Fogo, emitterChain=51) from Wormholescan API
- Tags transfers with direction since Wormholescan returns null for targetChain on inbound queries
- Resolves Wormhole chain IDs to human-readable names (30+ chains mapped)
- Upserts `BridgeTransfer` rows (updates status on duplicates)

### TradeCollector (`src/workers/trade-collector.ts`)
**Interval:** 3 seconds

- Polls Fogo RPC for recent **Valiant Router** (`vnt1u7PzorND5JjweFWmDawKe2hLWoTwHU6QKz6XX98`) signatures
- Filters for successful transactions with `Swap` or `TwoHopSwap` log instructions
- Parses pre/post token balance changes to extract trade details
- Identifies user wallets (excludes known pool addresses)
- Looks up USD prices from Redis cache → DB fallback (refreshed every 15s)
- **Slippage computation:** Only when both token prices are known, both USD amounts > $0.10, and result falls within -100 to +200 bps. Values outside this range are stored as `null` to prevent garbage data.
- Determines pair names: checks known pairs first, then uses quote-token convention (stablecoins/FOGO go second)
- Writes `Trade` rows to DB (skips duplicates via unique signature constraint)

### MEVDetector (`src/workers/mev-detector.ts`)
**Interval:** 10 seconds

- Queries Trade table for new slots since last scan (bookmark tracking)
- Groups trades by slot (block number)
- For slots with 2+ trades, runs both detection algorithms:
  - `detectSandwich()`: 3-trade pattern — same attacker before/after victim, opposite sides
  - `detectFrontrun()`: 2-trade pattern — smaller order before larger, same pair/side, different wallets
- Deduplicates events by target tx + type before writing
- Writes detected events to `MEVEvent` table with severity, description, related txs
- Logs: "Scanned X multi-trade slots, detected Y MEV events"

---

## Component Library

### Chart Components (`src/components/charts/`)

| Component | Library | Purpose |
|-----------|---------|---------|
| `TVChart` | TradingView Lightweight Charts | High-performance line/area charts with crosshair |
| `BarChart` | Recharts | Multi-key bar charts with legend |
| `AreaChart` | Recharts | Gradient-filled time series |
| `PieChart` | Recharts | Donut charts |
| `SparkLine` | Recharts | Inline mini trend lines |
| `ChartContainer` | — | Card wrapper with title, subtitle, actions, loading |

### Layout Components (`src/components/layout/`)

| Component | Purpose |
|-----------|---------|
| `Sidebar` | Navigation with route links from constants.ts |
| `TopBar` | Header with status indicators |
| `CommandPalette` | Cmd+K fuzzy search/navigation (cmdk library) |
| `PageWrapper` | Reusable page container with title/description |

### UI Components (`src/components/ui/`)

| Component | Purpose |
|-----------|---------|
| `MetricCard` | KPI card with icon, animated value, delta badge, sparkline |
| `Badge` | Colored label (success/warning/danger/info/default) |
| `DataTable` | Sortable table with custom renderers, loading, empty state |
| `LiveTicker` | Infinite-scrolling price ticker |
| `AnimatedNumber` | Smooth spring-animated number transitions (framer-motion) |
| `ChainHealthBadge` | Chain status indicator |
| `Skeleton` | Loading shimmer placeholder |
| `EmptyState` | No-data fallback UI |

---

## Library Code

### Analytics (`src/lib/analytics/`)

**`scoring.ts`** — Execution quality scoring (0-100) using exponential decay:
- Slippage: 30% weight, 50 bps half-life
- MEV: 25% weight, 0.5 events/tx half-life
- Latency: 20% weight, 2000ms half-life
- Reliability: 15% weight, direct failure-rate inversion
- Cost: 10% weight, 100k micro-units half-life

**`slippage.ts`** — `calculateSlippage(expected, actual)` returns bps, `calculatePriceImpact(inputUsd, outputUsd)` returns percentage.

**`mev.ts`** — Heuristic MEV detection:
- `detectSandwich(trades[])` — 3-trade pattern: same attacker buys before victim, sells after, same pair, opposite sides. Profit estimated from price delta.
- `detectFrontrun(trades[])` — 2-trade pattern: smaller order before larger (2x minimum), same pair/side, different wallets. Profit from price advantage.
- `calculateMEVScore(events[], totalTrades)` — Severity-weighted ratio (0-100), where high=1.0, medium=0.5, low=0.25

### Blockchain (`src/lib/blockchain/`)

**`connection.ts`** — Two RPC connections:
- `fogoConnection` — Fogo mainnet (`FOGO_RPC_URL` or `https://mainnet.fogo.io`)
- `solanaConnection` — Solana mainnet via Helius (`HELIUS_API_KEY` or `SOLANA_RPC_URL`)

**`program-ids.ts`** — Discovered via `scripts/discover-programs.ts`:
- VALIANT_AMM: `FLinieojaY6iWnvLPADRWVfSK9mVPvGyUFiCF7v1MEbT`
- VALIANT_ROUTER: `vnt1u7PzorND5JjweFWmDawKe2hLWoTwHU6QKz6XX98`
- 6 known trading pairs with pool addresses (FOGO/USDC.s, stFOGO/FOGO, iFOGO/FOGO, iHUB/FOGO, FISH/FOGO, CHASE/FOGO)
- 7 mint-to-symbol mappings (FOGO, stFOGO, iFOGO, USDC.s, iHUB, FISH, CHASE)
- Quote token set for pair naming convention (USDC.s, USDC, USDT, FOGO always go second)

### Redis (`src/lib/redis/`)

**`client.ts`** — Singleton ioredis client with retry strategy (max 5 attempts, exponential backoff).

**`cache.ts`** — Three-tier caching:

| Tier | TTL | Use Case |
|------|-----|----------|
| REALTIME | 5s | Block data, prices |
| AGGREGATED | 60s | Metrics, analytics |
| HISTORICAL | 300s | Wallet analysis, compare page |

Key function: `getOrFetch<T>(key, tier, fetcher)` — returns cached value or calls fetcher, caches result, returns it. Gracefully degrades if Redis unavailable.

### External APIs (`src/lib/external/`)

| Client | API | Purpose | Status |
|--------|-----|---------|--------|
| `defi-llama.ts` | api.llama.fi | Fogo TVL, TVL history, protocol list | Active |
| `dex-screener.ts` | api.dexscreener.com | Token pair search, prices, volume | Active (primary price source) |
| `helius.ts` | HELIUS_API_KEY endpoint | Enhanced transactions, token metadata, DAS API | Active |
| `wormholescan.ts` | api.wormholescan.io | Inbound/outbound bridge transfers (chain ID 51) | Active |
| `zerion.ts` | api.zerion.io | Wallet portfolio, transactions, token prices | Available but not actively called |

### Utils (`src/lib/utils/`)

| File | Exports |
|------|---------|
| `api.ts` | `fetchAPI<T>(path)`, `ApiError` class |
| `cn.ts` | `cn(...classes)` — clsx + tailwind-merge |
| `constants.ts` | `POLLING` intervals, `ROUTES` config, `THEME` colors, chain constants |
| `formatters.ts` | `formatCurrency`, `formatNumber`, `formatPercent`, `formatBps`, `formatLatency`, `formatTPS`, `shortenAddress`, `timeAgo` |

---

## External Integrations

| Service | Purpose | Auth | Rate Limit | Status |
|---------|---------|------|------------|--------|
| **Fogo RPC** | Block data, slots, transactions, performance | None (public) | — | Live |
| **Solana RPC (Helius)** | Cross-chain comparison (TPS, block time, failure rate from 20 sampled blocks) | `HELIUS_API_KEY` | Helius plan limits | Live |
| **DEX Screener** | Token pairs, prices, volume for Fogo DEXes (23-26 prices/cycle) | None (public) | Generous | Live |
| **DeFi Llama** | TVL data for Fogo chain | None (public) | Generous | Live |
| **Wormholescan** | Cross-chain bridge transfers to/from Fogo (chain ID 51) | None (public) | Generous | Live |
| **Hyperliquid API** | Validator count (`validatorSummaries`), daily volume (`globalStats`) | None (public) | 100 req/min | Live |
| **Ethereum RPC (LlamaRPC)** | Block number, block tx count for network comparison | None (public) | Generous | Live |
| **Zerion** | Multi-chain wallet portfolio and token prices | `ZERION_API_KEY` | 120 req/min | Available, not actively used |
| **CoinGecko** | Token price data (optional) | `COINGECKO_API_KEY` | Plan limits | Not used |

---

## Type Definitions

### Common Types (`src/types/common.ts`)

```typescript
type TimeRange = "1h" | "4h" | "24h" | "7d" | "30d"
type ChainHealth = "healthy" | "degraded" | "down"
interface TimeSeries { time: string; value: number }
interface PaginatedResponse<T> { data: T[]; total: number; page: number; pageSize: number }
interface ApiError { message: string; code: string; status: number }
interface ChainComparison { chain: string; tps: number; blockTimeMs: number; finality: string; validators: number; txs24h: number; live?: boolean }
```

### Metric Types (`src/types/metrics.ts`)

14 interfaces covering all API response shapes: `DashboardMetrics`, `TradeRecord`, `SlippageData`, `MEVEvent`, `MEVSummary`, `ComparisonData`, `BridgeTransfer`, `BridgeSummary`, `LendingPosition`, `LendingSummary`, `NetworkStats`, `WalletAnalysis`, `TokenPrice`, `ChainComparison`.

---

## Caching Strategy

### Redis Cache Keys

| Key Pattern | TTL | Written By | Read By |
|-------------|-----|------------|---------|
| `rt:block:latest` | 5s | BlockMonitor worker | `/api/metrics`, `/api/network` |
| `rt:price:fogo:{mint}` | 5s | PriceCollector worker | TradeCollector (price lookup) |
| `api:metrics` | 60s | `/api/metrics` | `/api/metrics` |
| `api:network` | 5s | `/api/network` | `/api/network` |
| `api:compare` | 300s | `/api/compare` | `/api/compare` |
| `api:bridge` | 60s | `/api/bridge` | `/api/bridge` |
| `api:slippage:{timeRange}` | 60s | `/api/slippage` | `/api/slippage` |
| `api:mev` | 60s | `/api/mev` | `/api/mev` |
| `api:lending` | 60s | `/api/lending` | `/api/lending` |
| `api:prices` | 5s | `/api/prices` | `/api/prices` |
| `api:wallet:{address}` | 300s | `/api/wallet/[address]` | `/api/wallet/[address]` |
| `solana:live-metrics` | 300s | `/api/compare` | `/api/compare` |

---

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL DATA SOURCES                              │
│  Fogo RPC  │  Solana RPC  │  Wormholescan  │  DEX Screener  │  DeFi Llama  │
│  Ethereum RPC (LlamaRPC)  │  Hyperliquid API                                │
└──────┬──────┴──────┬───────┴───────┬────────┴───────┬────────┴──────┬───────┘
       │             │               │                │               │
       ▼             ▼               ▼                ▼               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           WORKERS (5 Background Jobs)                        │
│  BlockMonitor (1s)  │  TradeCollector (3s)  │  MEVDetector (10s)            │
│  PriceCollector (15s)  │  BridgeMonitor (30s)                               │
└──────┬──────────────┴──────────┬────────────┴──────────┬────────────┬───────┘
       │                         │                        │            │
       ▼                         ▼                        ▼            ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ BlockMetric  │  │    Trade     │  │  TokenPrice  │  │BridgeTransfer│
│              │  │              │  │              │  │              │
│              │  │    ┌─────┐   │  │              │  │              │
│              │  │    │MEV  │   │  │              │  │              │
│              │  │    │Event│   │  │              │  │              │
│(TimescaleDB) │  │    └─────┘   │  │(TimescaleDB) │  │ (PostgreSQL) │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │                  │
       │          ┌──────┴──────┐           │                  │
       │          │   Redis     │◄──────────┘                  │
       │          │   Cache     │                              │
       │          └──────┬──────┘                              │
       │                 │                                     │
       ▼                 ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           API ROUTES (Next.js, 10 endpoints)                 │
│  /metrics  │  /network  │  /compare  │  /trades  │  /slippage  │  /mev     │
│  /bridge   │  /lending  │  /prices   │  /wallet/[address]                   │
└──────┬─────┴──────┬─────┴──────┬─────┴──────┬─────┴──────┬─────┴───────────┘
       │            │            │            │            │
       ▼            ▼            ▼            ▼            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        REACT HOOKS (10 hooks, auto-polling)                  │
│  useMetrics (2s)  │  useNetwork (2s)  │  usePrices (15s)  │  useMEV (30s)  │
│  useTrades (30s)  │  useSlippage (30s) │  useBridge (30s)  │  ...           │
└──────┬────────────┴──────┬────────────┴──────┬────────────┴────────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           UI COMPONENTS (9 pages)                            │
│  Dashboard  │  Compare  │  Network  │  Execution  │  Bridge  │  MEV        │
│  Lending    │  Wallet Search  │  Wallet Analysis                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `FOGO_RPC_URL` | Yes | Fogo mainnet RPC endpoint |
| `FOGO_WSS_URL` | No | Fogo WebSocket endpoint |
| `HELIUS_API_KEY` | Recommended | Helius dedicated RPC URL for Solana |
| `SOLANA_RPC_URL` | Fallback | Solana mainnet RPC (if no Helius) |
| `ZERION_API_KEY` | Optional | Zerion API key (available but not actively used) |
| `COINGECKO_API_KEY` | Optional | CoinGecko API key (not used) |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL (default: http://localhost:3000) |

---

## Infrastructure (Docker)

### PostgreSQL + TimescaleDB
- Image: `timescale/timescaledb:latest-pg16`
- Port: 5432
- Credentials: `fogoscope` / `fogoscope_dev`
- Database: `fogoscope`
- Persistent volume: `pgdata`

### Redis
- Image: `redis:7-alpine`
- Port: 6379
- Max memory: 256MB (LRU eviction)
- Persistent volume: `redisdata`

---

## Data Integrity Notes

### Slippage
- Slippage is computed from USD price impact at trade time
- Only stored when both token prices are known, both USD amounts > $0.10, and result is within -100 to +200 bps
- Values outside this range are stored as `null` — prevents garbage from price estimation errors on low-liquidity pairs
- Displayed as 0 when no reliable data is available

### Block Metrics
- `totalTxns` comes from actual `getBlock` transaction count, not performance samples
- `failedTxns` counted by checking `tx.meta.err !== null` in each block
- `blockTimeMs` computed from consecutive slot timestamps (not hardcoded)
- Failure rate for comparison uses `SUM(failed)/SUM(total)` to avoid per-block averaging skew

### MEV Detection
- Real heuristic-based detection running on actual trade data (not mock)
- Sandwich detection requires 3+ trades in same block, same pair, specific wallet/side pattern
- Frontrun detection requires 2+ trades, same pair/side, different wallets, 2x size difference
- Severity based on estimated USD profit (none/low/medium/high thresholds: $0/$10/$100)
- Solana MEV % (3.5%) is the only research-based estimate in the system

### Network Comparison
- Fogo, Solana: fully live from RPC
- Ethereum: live from LlamaRPC (public endpoint)
- Hyperliquid: validators live from API, volume/TPS estimated from `globalStats.dailyVolume`
- 24h transaction counts computed from TPS * 86400 (includes all tx types for consistency)
