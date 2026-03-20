import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/utils/api";
import { POLLING } from "@/lib/utils/constants";
import type { TradeRecord } from "@/types/metrics";
import type { PaginatedResponse } from "@/types/common";

export interface UseTradesParams {
  page?: number;
  limit?: number;
  dex?: string;
  pair?: string;
  wallet?: string;
}

function buildQueryString(params: UseTradesParams): string {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    searchParams.set("limit", String(params.limit));
  if (params.dex) searchParams.set("dex", params.dex);
  if (params.pair) searchParams.set("pair", params.pair);
  if (params.wallet) searchParams.set("wallet", params.wallet);

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export function useTrades(params: UseTradesParams = {}) {
  return useQuery<PaginatedResponse<TradeRecord>>({
    queryKey: [
      "trades",
      params.page,
      params.limit,
      params.dex,
      params.pair,
      params.wallet,
    ],
    queryFn: () =>
      fetchAPI<PaginatedResponse<TradeRecord>>(
        `/api/trades${buildQueryString(params)}`
      ),
    refetchInterval: POLLING.STANDARD,
  });
}
