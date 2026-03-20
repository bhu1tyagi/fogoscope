"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  AreaSeries,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
} from "lightweight-charts";
import { cn } from "@/lib/utils/cn";
import Skeleton from "@/components/ui/Skeleton";

interface TVChartData {
  time: string;
  value: number;
}

interface TVChartProps {
  data: TVChartData[];
  overlayData?: TVChartData[];
  type?: "area" | "line" | "histogram";
  height?: number;
  lineColor?: string;
  overlayColor?: string;
  areaTopColor?: string;
  areaBottomColor?: string;
  loading?: boolean;
  className?: string;
}

function parseTimeToEpoch(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

export function TVChart({
  data,
  overlayData,
  type = "area",
  height = 300,
  lineColor = "#06b6d4",
  overlayColor = "#9945FF",
  areaTopColor = "rgba(6, 182, 212, 0.3)",
  areaBottomColor = "rgba(6, 182, 212, 0.0)",
  loading = false,
  className,
}: TVChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);

  useEffect(() => {
    if (!containerRef.current || loading) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#111827" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: "#1e293b",
      },
      rightPriceScale: {
        borderColor: "#1e293b",
      },
    });

    chartRef.current = chart;

    // Add primary series based on type
    let series: ISeriesApi<SeriesType>;

    if (type === "area") {
      series = chart.addSeries(AreaSeries, {
        lineColor,
        topColor: areaTopColor,
        bottomColor: areaBottomColor,
        lineWidth: 2,
      });
    } else if (type === "line") {
      series = chart.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: 2,
      });
    } else {
      series = chart.addSeries(HistogramSeries, {
        color: lineColor,
      });
    }

    seriesRef.current = series;

    // Map and set data
    const mappedData = data.map((d) => ({
      time: parseTimeToEpoch(d.time) as unknown as import("lightweight-charts").Time,
      value: d.value,
    }));
    series.setData(mappedData);

    // Add overlay series if provided
    if (overlayData && overlayData.length > 0) {
      const overlaySeries = chart.addSeries(LineSeries, {
        color: overlayColor,
        lineWidth: 2,
        lineStyle: 0, // Solid
      });
      overlaySeriesRef.current = overlaySeries;

      const mappedOverlay = overlayData.map((d) => ({
        time: parseTimeToEpoch(d.time) as unknown as import("lightweight-charts").Time,
        value: d.value,
      }));
      overlaySeries.setData(mappedOverlay);
    }

    chart.timeScale().fitContent();

    // Responsive resizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        chart.applyOptions({ width });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      overlaySeriesRef.current = null;
    };
  }, [
    data,
    overlayData,
    type,
    height,
    lineColor,
    overlayColor,
    areaTopColor,
    areaBottomColor,
    loading,
  ]);

  if (loading) {
    return (
      <div
        className={cn("rounded-xl overflow-hidden", className)}
        style={{ height }}
      >
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("rounded-xl overflow-hidden", className)}
      style={{ height }}
    />
  );
}

export default TVChart;
