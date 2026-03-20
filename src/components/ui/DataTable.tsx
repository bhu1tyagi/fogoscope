"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Skeleton from "./Skeleton";
import EmptyState from "./EmptyState";

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  tooltip?: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  loading?: boolean;
  onRowClick?: (row: Record<string, unknown>) => void;
  emptyMessage?: string;
  emptyAnimation?: React.ReactNode;
}

type SortDirection = "asc" | "desc";

export default function DataTable({
  columns,
  data,
  loading = false,
  onRowClick,
  emptyMessage = "No data available",
  emptyAnimation,
}: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [data, sortKey, sortDir]);

  return (
    <div className="bg-bg-card rounded-xl border border-border-default overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-sidebar">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-text-secondary text-xs uppercase tracking-wider font-medium whitespace-nowrap",
                    col.align === "right" ? "text-right" : "text-left",
                    col.sortable && "cursor-pointer select-none hover:text-text-primary transition-colors"
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, rowIdx) => (
                  <tr
                    key={`skeleton-${rowIdx}`}
                    className="border-b border-border-default"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : sortedData.length === 0
                ? (
                  <tr>
                    <td colSpan={columns.length}>
                      <EmptyState title={emptyMessage} animation={emptyAnimation} />
                    </td>
                  </tr>
                )
                : sortedData.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={cn(
                        "border-b border-border-default text-sm hover:bg-bg-card-hover transition-colors",
                        onRowClick && "cursor-pointer"
                      )}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((col) => {
                        const cellValue = row[col.key];
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "px-4 py-3 text-text-primary whitespace-nowrap",
                              col.align === "right" && "text-right"
                            )}
                          >
                            {col.render
                              ? col.render(cellValue, row)
                              : cellValue != null
                                ? String(cellValue)
                                : "\u2014"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
