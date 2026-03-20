"use client";

import { useEffect, useRef } from "react";
import { useMEV } from "@/hooks/useMEV";
import { useTrades } from "@/hooks/useTrades";
import { useBridge } from "@/hooks/useBridge";
import { notify } from "@/lib/notifications";

export function NotificationLayer() {
  // --- MEV Watcher ---
  const { data: mevData } = useMEV({});
  const prevMevCountRef = useRef<number | null>(null);
  const mevInitRef = useRef(false);

  useEffect(() => {
    if (!mevData) return;
    const count = mevData.totalEvents24h;

    if (!mevInitRef.current) {
      prevMevCountRef.current = count;
      mevInitRef.current = true;
      return;
    }

    if (prevMevCountRef.current !== null && count > prevMevCountRef.current) {
      const newest = mevData.events[0];
      if (newest) {
        notify.mev(newest.type, newest.severity as "low" | "medium" | "high");
      }
    }
    prevMevCountRef.current = count;
  }, [mevData]);

  // --- Trade Watcher ---
  const { data: tradeData } = useTrades({ limit: 1 });
  const prevTradeIdRef = useRef<string | null>(null);
  const tradeInitRef = useRef(false);

  useEffect(() => {
    if (!tradeData?.data?.length) return;
    const latest = tradeData.data[0];

    if (!tradeInitRef.current) {
      prevTradeIdRef.current = latest.id;
      tradeInitRef.current = true;
      return;
    }

    if (prevTradeIdRef.current !== latest.id) {
      notify.trade(latest.pair, latest.amountInUsd);
      prevTradeIdRef.current = latest.id;
    }
  }, [tradeData]);

  // --- Bridge Watcher (large transfers > $50K) ---
  const { data: bridgeData } = useBridge({});
  const prevBridgeIdRef = useRef<string | null>(null);
  const bridgeInitRef = useRef(false);

  useEffect(() => {
    if (!bridgeData?.transfers?.length) return;
    const latest = bridgeData.transfers[0];

    if (!bridgeInitRef.current) {
      prevBridgeIdRef.current = latest.id;
      bridgeInitRef.current = true;
      return;
    }

    if (prevBridgeIdRef.current !== latest.id && latest.amountUsd > 50_000) {
      notify.bridge(latest.amountUsd, latest.sourceChain, latest.direction);
      prevBridgeIdRef.current = latest.id;
    }
  }, [bridgeData]);

  return null;
}
