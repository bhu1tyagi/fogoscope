"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Zap,
  Shield,
  Swords,
  ArrowLeftRight,
  Landmark,
  Activity,
  Gauge,
  Search,
  Wallet,
  TrendingUp,
  Award,
  Clock,
  Timer,
  Share2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/utils/constants";
import { useMetrics } from "@/hooks/useMetrics";
import { shortenAddress } from "@/lib/utils/formatters";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Zap,
  Shield,
  Swords,
  ArrowLeftRight,
  Landmark,
  Activity,
  Gauge,
  Search,
};

const itemClassName = cn(
  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer",
  "text-text-secondary",
  "data-[selected=true]:bg-accent-cyan/10 data-[selected=true]:text-text-primary",
  "transition-colors"
);

const groupHeadingClassName =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-muted";

function isWalletAddress(input: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.trim());
}

function isTradingPair(input: string): boolean {
  return /^[A-Za-z.]{2,12}\/[A-Za-z.]{2,12}$/.test(input.trim());
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data: metrics } = useMetrics();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      setSearch("");
      router.push(path);
    },
    [router]
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const trimmedSearch = search.trim();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/50 z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "w-full md:max-w-lg md:mx-auto md:mt-[20vh]",
              "max-md:h-full max-md:flex max-md:flex-col"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Command
              className={cn(
                "bg-bg-card rounded-xl md:rounded-xl max-md:rounded-none border border-border-default shadow-2xl overflow-hidden",
                "max-md:flex max-md:flex-col max-md:h-full"
              )}
              label="Command Palette"
            >
              <div className="flex items-center px-4 border-b border-border-default">
                <Search className="w-4 h-4 text-text-muted shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  autoFocus
                  placeholder="Search pages, wallets, pairs..."
                  className={cn(
                    "w-full h-12 px-3 bg-transparent text-text-primary text-sm",
                    "placeholder:text-text-muted outline-none"
                  )}
                />
              </div>

              <Command.List className={cn("max-h-[300px] overflow-y-auto p-2", "max-md:flex-1 max-md:max-h-none")}>
                <Command.Empty className="py-6 text-center text-sm text-text-muted">
                  No results found.
                </Command.Empty>

                {/* Dynamic: Wallet Address */}
                {isWalletAddress(trimmedSearch) && (
                  <Command.Group heading="Wallet" className={groupHeadingClassName}>
                    <Command.Item
                      value={`wallet-${trimmedSearch}`}
                      onSelect={() => handleSelect(`/wallet/${trimmedSearch}`)}
                      className={itemClassName}
                    >
                      <Wallet className="w-4 h-4 shrink-0" />
                      <span>Analyze wallet {shortenAddress(trimmedSearch)}</span>
                    </Command.Item>
                  </Command.Group>
                )}

                {/* Dynamic: Trading Pair */}
                {isTradingPair(trimmedSearch) && (
                  <Command.Group heading="Trading Pairs" className={groupHeadingClassName}>
                    <Command.Item
                      value={`pair-${trimmedSearch}`}
                      onSelect={() =>
                        handleSelect(`/execution?pair=${encodeURIComponent(trimmedSearch.toUpperCase())}`)
                      }
                      className={itemClassName}
                    >
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      <span>View trades for {trimmedSearch.toUpperCase()}</span>
                    </Command.Item>
                  </Command.Group>
                )}

                {/* Pages */}
                <Command.Group heading="Pages" className={groupHeadingClassName}>
                  {ROUTES.map((route) => {
                    const Icon = iconMap[route.icon];
                    return (
                      <Command.Item
                        key={route.path}
                        value={route.label}
                        onSelect={() => handleSelect(route.path)}
                        className={itemClassName}
                      >
                        {Icon && <Icon className="w-4 h-4 shrink-0" />}
                        <span>{route.label}</span>
                      </Command.Item>
                    );
                  })}
                  <Command.Item
                    value="wallet search"
                    onSelect={() => handleSelect("/wallet")}
                    className={itemClassName}
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    <span>Wallet Search</span>
                  </Command.Item>
                </Command.Group>

                {/* Quick Stats */}
                {metrics && !trimmedSearch && (
                  <>
                    <Command.Separator className="my-2 h-px bg-border-default" />
                    <Command.Group heading="Quick Stats" className={groupHeadingClassName}>
                      <Command.Item value="quick-stat-score" className={itemClassName} onSelect={() => handleSelect("/")}>
                        <Award className="w-4 h-4 shrink-0" />
                        <span>Execution Score: <span className="font-mono font-medium text-accent-cyan">{metrics.executionScore}/100</span></span>
                      </Command.Item>
                      <Command.Item value="quick-stat-tps" className={itemClassName} onSelect={() => handleSelect("/network")}>
                        <Activity className="w-4 h-4 shrink-0" />
                        <span>Current TPS: <span className="font-mono font-medium text-accent-cyan">{metrics.tps.toLocaleString()}</span></span>
                      </Command.Item>
                      <Command.Item value="quick-stat-blocktime" className={itemClassName} onSelect={() => handleSelect("/network")}>
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>Block Time: <span className="font-mono font-medium text-accent-cyan">{metrics.avgBlockTimeMs}ms</span></span>
                      </Command.Item>
                    </Command.Group>
                  </>
                )}

                {/* Actions */}
                <Command.Separator className="my-2 h-px bg-border-default" />
                <Command.Group heading="Actions" className={groupHeadingClassName}>
                  <Command.Item
                    value="action run speed test"
                    onSelect={() => handleSelect("/benchmarks")}
                    className={itemClassName}
                  >
                    <Timer className="w-4 h-4 shrink-0" />
                    <span>Run speed test</span>
                  </Command.Item>
                  <Command.Item
                    value="action share comparison report"
                    onSelect={() => handleSelect("/compare")}
                    className={itemClassName}
                  >
                    <Share2 className="w-4 h-4 shrink-0" />
                    <span>Share comparison report</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>

              <div className="flex items-center justify-between px-4 py-2 border-t border-border-default text-[10px] text-text-muted">
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-bg-primary border border-border-default font-mono">
                    &uarr;&darr;
                  </kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-bg-primary border border-border-default font-mono">
                    &crarr;
                  </kbd>
                  <span>Select</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-bg-primary border border-border-default font-mono">
                    Esc
                  </kbd>
                  <span>Close</span>
                </div>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
