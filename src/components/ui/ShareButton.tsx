"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { notify } from "@/lib/notifications";

interface ShareMetric {
  label: string;
  value: string;
}

interface ShareButtonProps {
  title: string;
  metrics?: ShareMetric[];
  ogUrl?: string;
  className?: string;
}

export default function ShareButton({ title, metrics = [], ogUrl, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const lines = [title];
    metrics.forEach((m) => lines.push(`• ${m.label}: ${m.value}`));
    lines.push("");
    lines.push("Data by @FogoScope");
    if (ogUrl) lines.push(ogUrl);
    else if (typeof window !== "undefined") lines.push(window.location.href);

    const text = lines.join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      notify.copied();
      setTimeout(() => setCopied(false), 2000);
    });

    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
        "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20",
        "hover:bg-accent-cyan/20 hover:border-accent-cyan/30 transition-all duration-200",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check size={16} />
          </motion.span>
        ) : (
          <motion.span
            key="share"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Share2 size={16} />
          </motion.span>
        )}
      </AnimatePresence>
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
