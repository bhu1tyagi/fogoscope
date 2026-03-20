"use client";

import { usePathname } from "next/navigation";
import { Command, ChevronRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/utils/constants";
import { useSidebar } from "@/providers/SidebarProvider";
import LiveIndicator from "@/components/ui/LiveIndicator";
import { useDataFreshness } from "@/hooks/useDataFreshness";

export function TopBar() {
  const pathname = usePathname();
  const { setMobileOpen } = useSidebar();
  const isLive = useDataFreshness(["metrics"]);

  const allRoutes = [
    ...ROUTES,
    { path: "/wallet", label: "Wallet Search", icon: "Search" as const },
  ];
  const currentRoute = allRoutes.find((r) => r.path === pathname);
  const currentLabel = currentRoute?.label ?? "Page";

  const handleSearchClick = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 md:px-6 bg-bg-primary/80 backdrop-blur-sm border-b border-border-default">
      {/* Left section */}
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-3 -ml-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm">
          <span className="text-text-muted hidden sm:inline">FogoScope</span>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted hidden sm:inline" />
          <span className="text-text-primary font-medium">{currentLabel}</span>
        </nav>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Search button */}
        <button
          onClick={handleSearchClick}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg",
            "border border-border-default bg-bg-card/50",
            "text-text-secondary text-sm",
            "hover:border-border-hover hover:text-text-primary transition-colors"
          )}
        >
          <Command className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="ml-2 px-1.5 py-0.5 rounded bg-bg-primary text-[10px] font-mono text-text-muted border border-border-default hidden sm:inline">
            <span className="text-[10px]">&#8984;</span>K
          </kbd>
        </button>

        <LiveIndicator isLive={isLive} />
      </div>
    </header>
  );
}
