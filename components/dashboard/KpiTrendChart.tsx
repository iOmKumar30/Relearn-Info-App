"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

export default function KpiTrendChart({
  data,
  kpiId,
}: {
  data: Array<{ name: string; value: number | null }>;
  kpiId: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${kpiId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#gradient-${kpiId})`}
          isAnimationActive
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
