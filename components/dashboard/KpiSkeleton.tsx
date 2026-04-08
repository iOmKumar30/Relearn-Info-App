export function KpiSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white/50 p-5 shadow-sm backdrop-blur-xl">
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/60 to-transparent" />
      
      <div className="flex items-center justify-between">
        <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
        <div className="h-5 w-12 rounded-full bg-gray-200 animate-pulse" />
      </div>
      
      <div className="mt-4 h-10 w-1/3 rounded bg-gray-200 animate-pulse" />
      
      <div className="mt-6 space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-1/4 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-1/4 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div className="h-full w-1/3 rounded-full bg-gray-200 animate-pulse" />
        </div>
      </div>
      
      <div className="mt-5 h-8 w-full rounded bg-gray-100 animate-pulse" />
    </div>
  );
}
