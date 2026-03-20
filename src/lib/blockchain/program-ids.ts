/**
 * Known on-chain program IDs for Fogo DEXes and protocols.
 * Discovered via scripts/discover-programs.ts against mainnet.
 */
export const PROGRAM_IDS = {
  VALIANT_AMM: "FLinieojaY6iWnvLPADRWVfSK9mVPvGyUFiCF7v1MEbT",
  VALIANT_ROUTER: "vnt1u7PzorND5JjweFWmDawKe2hLWoTwHU6QKz6XX98",
  // AMBIENT_PERPS: "", // Uncomment when Ambient Finance deploys perps on Fogo
} as const;

export type ProgramName = keyof typeof PROGRAM_IDS;

/**
 * Known trading pairs on Fogo DEXes.
 * Discovered from DEX Screener mainnet data.
 */
export const KNOWN_PAIRS = [
  { name: "FOGO/USDC.s", dex: "valiant", pairAddress: "J7mxBLSz51Tcbog3XsiJTAXS64N46KqbpRGQmd3dQMKp" },
  { name: "stFOGO/FOGO", dex: "valiant", pairAddress: "Be2eoA9g1Yp8WKqMM14tXjSHuYCudaPpaudLTmC4gizp" },
  { name: "iFOGO/FOGO", dex: "valiant", pairAddress: "HULdR8aMSxJAiNJmrTBcfKN4Zq6FgG33AHbQ3nDD8P5E" },
  { name: "iHUB/FOGO", dex: "valiant", pairAddress: "Ehd5SgBc1UmnXzftJrsiKc4hu8nQ6PumiXoaEEs2znQS" },
  { name: "FISH/FOGO", dex: "valiant", pairAddress: "5GNp2X5SBa9SzDpjwvwAyR17BaVzMoS835UjuVysFaoQ" },
  { name: "CHASE/FOGO", dex: "valiant", pairAddress: "2zKEnSqCVwPUgR6UkNDr6U5PYGpfwXFrV1pT9LRxQCtk" },
] as const;

/**
 * Known mint addresses → human-readable symbols.
 */
export const MINT_SYMBOLS: Record<string, string> = {
  "So11111111111111111111111111111111111111112": "FOGO",
  "Brasa3xzkSC9XqMBEcN9v53x4oMkpb1nQwfaGMyJE88b": "stFOGO",
  "iFoGoY5nMWpuMJogR7xjUAWDJtygHDF17zREeP4MKuD": "iFOGO",
  "uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG": "USDC.s",
  "ihubQzRUU6ngToEbWq4oNNFVt364Cfho2pMSjy7Naac": "iHUB",
  "F1SHuJ3sFF2wJoYbUJxK4iZ6CYg6MakFj8q6QHACFd4s": "FISH",
  "GPK71dya1H975s3U4gYaJjrRCp3BGyAD8fmZCtSmBCcz": "CHASE",
};

export type KnownPair = (typeof KNOWN_PAIRS)[number];
