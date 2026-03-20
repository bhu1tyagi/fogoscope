-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "slot" BIGINT NOT NULL,
    "dex" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "tokenIn" TEXT NOT NULL,
    "tokenOut" TEXT NOT NULL,
    "amountIn" DECIMAL(65,30) NOT NULL,
    "amountOut" DECIMAL(65,30) NOT NULL,
    "amountInUsd" DECIMAL(65,30),
    "amountOutUsd" DECIMAL(65,30),
    "expectedOut" DECIMAL(65,30),
    "slippageBps" DECIMAL(65,30),
    "priceImpact" DECIMAL(65,30),
    "executionTimeMs" INTEGER,
    "executionQuality" INTEGER,
    "wallet" TEXT NOT NULL,
    "isSession" BOOLEAN NOT NULL DEFAULT false,
    "sessionPda" TEXT,
    "fee" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id","timestamp")
);

-- CreateTable
CREATE TABLE "BlockMetric" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "slot" BIGINT NOT NULL,
    "blockTimeMs" INTEGER NOT NULL,
    "tps" INTEGER NOT NULL,
    "totalTxns" INTEGER NOT NULL,
    "failedTxns" INTEGER NOT NULL,
    "successRate" DECIMAL(65,30) NOT NULL,
    "leader" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockMetric_pkey" PRIMARY KEY ("id","timestamp")
);

-- CreateTable
CREATE TABLE "MEVEvent" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "slot" BIGINT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "relatedTxs" TEXT[],
    "estimatedProfit" DECIMAL(65,30),
    "victimWallet" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MEVEvent_pkey" PRIMARY KEY ("id","timestamp")
);

-- CreateTable
CREATE TABLE "CrossChainComparison" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "pair" TEXT NOT NULL,
    "fogoPrice" DECIMAL(65,30) NOT NULL,
    "solanaPrice" DECIMAL(65,30) NOT NULL,
    "fogoSlippageBps" DECIMAL(65,30),
    "solanaSlippageBps" DECIMAL(65,30),
    "fogoLatencyMs" INTEGER,
    "solanaLatencyMs" INTEGER,
    "fogoBetter" BOOLEAN NOT NULL,
    "improvementBps" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrossChainComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BridgeTransfer" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "sourceChain" TEXT NOT NULL,
    "destChain" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "amountUsd" DECIMAL(65,30),
    "senderAddress" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "txHashSource" TEXT,
    "txHashTarget" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BridgeTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LendingPosition" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "collateralToken" TEXT NOT NULL,
    "collateralAmount" DECIMAL(65,30) NOT NULL,
    "borrowToken" TEXT NOT NULL,
    "borrowAmount" DECIMAL(65,30) NOT NULL,
    "healthFactor" DECIMAL(65,30) NOT NULL,
    "liquidationPrice" DECIMAL(65,30),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LendingPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkSnapshot" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "chain" TEXT NOT NULL,
    "avgBlockTimeMs" DECIMAL(65,30) NOT NULL,
    "avgTps" DECIMAL(65,30) NOT NULL,
    "totalTxs24h" BIGINT NOT NULL,
    "activeValidators" INTEGER NOT NULL,
    "tvlUsd" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkSnapshot_pkey" PRIMARY KEY ("id","timestamp")
);

-- CreateTable
CREATE TABLE "TokenPrice" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "priceUsd" DECIMAL(65,30) NOT NULL,
    "volume24h" DECIMAL(65,30),
    "liquidity" DECIMAL(65,30),
    "change24h" DECIMAL(65,30),
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenPrice_pkey" PRIMARY KEY ("id","timestamp")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trade_signature_key" ON "Trade"("signature");

-- CreateIndex
CREATE INDEX "Trade_timestamp_idx" ON "Trade"("timestamp");

-- CreateIndex
CREATE INDEX "Trade_wallet_idx" ON "Trade"("wallet");

-- CreateIndex
CREATE INDEX "Trade_dex_idx" ON "Trade"("dex");

-- CreateIndex
CREATE INDEX "Trade_pair_idx" ON "Trade"("pair");

-- CreateIndex
CREATE INDEX "Trade_signature_idx" ON "Trade"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "BlockMetric_slot_key" ON "BlockMetric"("slot");

-- CreateIndex
CREATE INDEX "BlockMetric_timestamp_idx" ON "BlockMetric"("timestamp");

-- CreateIndex
CREATE INDEX "MEVEvent_timestamp_idx" ON "MEVEvent"("timestamp");

-- CreateIndex
CREATE INDEX "MEVEvent_eventType_idx" ON "MEVEvent"("eventType");

-- CreateIndex
CREATE INDEX "CrossChainComparison_timestamp_idx" ON "CrossChainComparison"("timestamp");

-- CreateIndex
CREATE INDEX "CrossChainComparison_pair_idx" ON "CrossChainComparison"("pair");

-- CreateIndex
CREATE UNIQUE INDEX "BridgeTransfer_operationId_key" ON "BridgeTransfer"("operationId");

-- CreateIndex
CREATE INDEX "BridgeTransfer_timestamp_idx" ON "BridgeTransfer"("timestamp");

-- CreateIndex
CREATE INDEX "BridgeTransfer_sourceChain_destChain_idx" ON "BridgeTransfer"("sourceChain", "destChain");

-- CreateIndex
CREATE INDEX "LendingPosition_wallet_idx" ON "LendingPosition"("wallet");

-- CreateIndex
CREATE INDEX "LendingPosition_healthFactor_idx" ON "LendingPosition"("healthFactor");

-- CreateIndex
CREATE INDEX "NetworkSnapshot_timestamp_chain_idx" ON "NetworkSnapshot"("timestamp", "chain");

-- CreateIndex
CREATE INDEX "TokenPrice_timestamp_token_chain_idx" ON "TokenPrice"("timestamp", "token", "chain");
