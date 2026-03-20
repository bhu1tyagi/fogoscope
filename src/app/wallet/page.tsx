"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { WalletSearchAnimation } from "@/components/animations";

export default function WalletSearchPage() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed.length >= 32 && trimmed.length <= 44) {
      router.push(`/wallet/${trimmed}`);
    }
  };

  return (
    <PageWrapper
      title="Wallet Analysis"
      description="Execution quality and trade history"
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="flex flex-col items-center gap-2">
          <WalletSearchAnimation size={80} />
          <h2 className="text-xl font-semibold text-text-primary">
            Wallet Analysis
          </h2>
          <p className="text-text-secondary text-sm">
            Enter a Fogo wallet address to analyze execution quality
          </p>
        </div>
        <form onSubmit={handleSubmit} className="w-full max-w-lg">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter wallet address..."
            className="bg-bg-card rounded-xl border border-border-default p-4 w-full text-lg font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan transition-colors"
          />
        </form>
      </div>
    </PageWrapper>
  );
}
