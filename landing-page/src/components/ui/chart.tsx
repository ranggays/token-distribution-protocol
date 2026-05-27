"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

type ChartStyle = React.CSSProperties & Record<`--color-${string}`, string>;

type ChartPayloadItem = {
  color?: string;
  dataKey?: string | number;
  fill?: string;
  name?: string | number;
  payload?: Record<string, unknown>;
  value?: unknown;
};

function ChartContainer({
  id,
  className,
  config,
  children,
}: {
  id?: string;
  className?: string;
  config: ChartConfig;
  children: React.ReactElement;
}) {
  const chartId = React.useId();
  const cssVariables = Object.entries(config).reduce<ChartStyle>((variables, [key, item]) => {
    variables[`--color-${key}`] = item.color;
    return variables;
  }, {} as ChartStyle);

  return (
    <div
      className={cn("h-[260px] w-full text-xs text-[#fffeea]/58", className)}
      data-chart={id ?? chartId}
      style={cssVariables}
    >
      <RechartsPrimitive.ResponsiveContainer height="100%" width="100%">
        {children}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
  config,
  hideLabel = false,
  valueFormatter,
}: {
  active?: boolean;
  payload?: ChartPayloadItem[];
  label?: string | number;
  config: ChartConfig;
  hideLabel?: boolean;
  valueFormatter?: (value: unknown, item: ChartPayloadItem) => React.ReactNode;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-36 rounded-[4px] border border-[#fffeea]/14 bg-[#13151a] px-3 py-2 text-sm text-[#fffeea] shadow-2xl shadow-black/40">
      {!hideLabel && label ? <div className="mb-2 font-medium text-white">{label}</div> : null}
      <div className="flex flex-col gap-1.5">
        {payload.map((item, index) => {
          const dataKey = String(item.dataKey ?? item.name ?? index);
          const indicatorColor = item.color ?? item.fill ?? config[dataKey]?.color ?? "#f2d467";
          const labelText = config[dataKey]?.label ?? String(item.name ?? dataKey);
          const value = valueFormatter ? valueFormatter(item.value, item) : String(item.value ?? "0");

          return (
            <div className="flex items-center justify-between gap-4" key={`${dataKey}-${index}`}>
              <span className="flex min-w-0 items-center gap-2 text-[#fffeea]/62">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: indicatorColor }} />
                <span className="truncate">{labelText}</span>
              </span>
              <span className="font-medium text-white">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

export { ChartContainer, ChartTooltip, ChartTooltipContent };
