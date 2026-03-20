import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Performance Benchmarks | FogoScope",
  description: "Live performance benchmarks for the Fogo blockchain — block time, TPS, and cross-chain comparisons",
  openGraph: {
    title: "Fogo Performance Benchmarks",
    description: "Fogo produces blocks every ~40ms — 10x faster than Solana",
    images: [{ url: "/api/og/benchmarks", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fogo Performance Benchmarks",
    images: ["/api/og/benchmarks"],
  },
};

export default function BenchmarksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
