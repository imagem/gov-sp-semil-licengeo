import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import { useWorkspace } from "./workspace-context";

export function AnalysisChart({
  title,
  option,
  onSelect,
}: {
  readonly title: string;
  readonly option: EChartsOption;
  readonly onSelect?: (name: string, series: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useWorkspace();
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, api.dark ? "dark" : undefined, {
      renderer: "svg",
    });
    chart.setOption({
      ...option,
      backgroundColor: "transparent",
      textStyle: { fontFamily: "Inter", fontSize: 12 },
      color: ["#087f8c", "#3e69ca", "#d39324", "#9a5db4"],
      animationDuration: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? 0
        : 250,
      aria: { enabled: true },
    });
    chart.on("click", (event: unknown) => {
      if (
        event &&
        typeof event === "object" &&
        "name" in event &&
        typeof event.name === "string"
      )
        onSelect?.(
          event.name,
          "seriesName" in event && typeof event.seriesName === "string"
            ? event.seriesName
            : "",
        );
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option, api.dark, onSelect]);
  return (
    <div ref={ref} className="analysis-chart" role="img" aria-label={title} />
  );
}
