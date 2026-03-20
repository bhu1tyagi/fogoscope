"use client";

import { motion } from "framer-motion";
import { Flame, ExternalLink } from "lucide-react";
import Badge from "@/components/ui/Badge";

export default function AmbientTracker() {
  return (
    <div className="bg-gradient-to-r from-accent-cyan/20 via-purple-500/20 to-accent-cyan/20 p-[1px] rounded-xl">
      <div className="bg-bg-card rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-cyan/10"
            >
              <Flame size={20} className="text-accent-cyan" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">
                  Ambient Finance Perps
                </h3>
                <Badge variant="info">Coming Soon</Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Perpetual futures trading on Fogo — tracking will activate when the protocol launches.
              </p>
            </div>
          </div>
          <a
            href="https://community-docs.fogo.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-cyan transition-colors"
          >
            Learn More
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
