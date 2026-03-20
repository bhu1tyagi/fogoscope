"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useDataFreshness(queryKey: string[], staleThresholdMs = 10_000) {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    const check = () => {
      const state = queryClient.getQueryState(queryKey);
      if (state?.dataUpdatedAt) {
        setIsLive(Date.now() - state.dataUpdatedAt < staleThresholdMs);
      }
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [queryClient, queryKey, staleThresholdMs]);

  return isLive;
}
