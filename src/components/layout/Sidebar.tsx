"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/utils/constants";
import { useSidebar } from "@/providers/SidebarProvider";

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

function SidebarNav({
  isExpanded,
  pathname,
  onLinkClick,
}: {
  isExpanded: boolean;
  pathname: string;
  onLinkClick?: () => void;
}) {
  return (
    <>
      {/* Brand */}
      <div className="flex items-center h-14 px-3 border-b border-border-default overflow-hidden">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-cyan/10 shrink-0">
          <span className="text-accent-cyan font-bold text-sm">FS</span>
        </div>
        <motion.span
          animate={{ opacity: isExpanded ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="ml-3 text-text-primary font-semibold text-sm whitespace-nowrap overflow-hidden"
        >
          FogoScope
        </motion.span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 py-3 px-2 overflow-hidden">
        {ROUTES.map((route) => {
          const Icon = iconMap[route.icon];
          const isActive = pathname === route.path;

          return (
            <Link
              key={route.path}
              href={route.path}
              onClick={onLinkClick}
              className={cn(
                "relative flex items-center h-10 px-2 rounded-lg transition-colors group",
                isActive
                  ? "bg-bg-card text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card/50"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent-cyan rounded-r-full"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              {Icon && (
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0",
                    isActive ? "text-accent-cyan" : "text-text-secondary group-hover:text-text-primary"
                  )}
                />
              )}
              <motion.span
                animate={{ opacity: isExpanded ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                className="ml-3 text-sm whitespace-nowrap overflow-hidden"
              >
                {route.label}
              </motion.span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Wallet Search */}
      <div className="px-2 pb-3 border-t border-border-default pt-3">
        <Link
          href="/wallet"
          onClick={onLinkClick}
          className={cn(
            "relative flex items-center h-10 px-2 rounded-lg transition-colors group",
            pathname === "/wallet"
              ? "bg-bg-card text-text-primary"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-card/50"
          )}
        >
          {pathname === "/wallet" && (
            <motion.div
              layoutId="sidebar-active-indicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent-cyan rounded-r-full"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <Search
            className={cn(
              "w-5 h-5 shrink-0",
              pathname === "/wallet"
                ? "text-accent-cyan"
                : "text-text-secondary group-hover:text-text-primary"
            )}
          />
          <motion.span
            animate={{ opacity: isExpanded ? 1 : 0 }}
            transition={{ duration: 0.15 }}
            className="ml-3 text-sm whitespace-nowrap overflow-hidden"
          >
            Wallet Search
          </motion.span>
        </Link>
      </div>
    </>
  );
}

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isMobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        animate={{ width: isExpanded ? 240 : 64 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="relative hidden md:flex flex-col h-screen bg-bg-sidebar border-r border-border-default z-20 shrink-0"
      >
        <SidebarNav isExpanded={isExpanded} pathname={pathname} />
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            {/* Panel */}
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: -240, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (info.velocity.x < -100 || info.offset.x < -80) {
                  setMobileOpen(false);
                }
              }}
              className="relative w-60 h-full bg-bg-sidebar border-r border-border-default flex flex-col"
            >
              <SidebarNav
                isExpanded={true}
                pathname={pathname}
                onLinkClick={() => setMobileOpen(false)}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
