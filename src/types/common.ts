export type TimeRange = "1h" | "4h" | "24h" | "7d" | "30d";
export type ChainHealth = "healthy" | "degraded" | "down";

export interface TimeSeries {
  time: string;
  value: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}
