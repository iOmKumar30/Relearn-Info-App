"use client";

import dynamic from "next/dynamic";

const AnalyticsDashboard = dynamic(
  () => import("./analytics-dashboard").then((module) => module.AnalyticsDashboard),
  { ssr: false },
);

export function AnalyticsDashboardLoader({ data }: { data: any }) {
  return <AnalyticsDashboard data={data} />;
}
