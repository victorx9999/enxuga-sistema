"use client";

export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-surface-3 ${className}`}
    />
  );
}

export function ShimmerText({ width = "w-24", height = "h-4" }: { width?: string; height?: string }) {
  return <Shimmer className={`${width} ${height}`} />;
}

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-lg border border-border bg-surface-2">
          <div className="flex items-center justify-between mb-3">
            <Shimmer className="w-20 h-3" />
            <Shimmer className="w-4 h-4 rounded" />
          </div>
          <Shimmer className="w-28 h-7 mb-2" />
          <Shimmer className="w-16 h-3" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Shimmer className="w-16 h-3" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, ri) => (
            <tr key={ri} className="border-b border-border/50">
              {Array.from({ length: cols }).map((_, ci) => (
                <td key={ci} className="px-4 py-3">
                  <Shimmer className={`h-4 ${ci === 0 ? "w-20" : ci === 1 ? "w-32" : "w-16"}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SummarySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-surface-2 border border-border rounded-lg">
          <Shimmer className="w-20 h-3 mb-2" />
          <Shimmer className="w-24 h-6" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="border border-border rounded-lg p-6 bg-surface-2">
      <Shimmer className="w-32 h-4 mb-4" />
      <div className="h-48 flex items-end gap-2 px-4">
        {[40, 65, 50, 80, 55, 70, 45, 90, 60, 75].map((h, i) => (
          <Shimmer key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function PageLoading({ type = "table" }: { type?: "dashboard" | "table" | "stock" }) {
  if (type === "dashboard") {
    return (
      <>
        <KpiSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </>
    );
  }

  if (type === "stock") {
    return (
      <>
        <SummarySkeleton count={2} />
        <TableSkeleton rows={3} cols={5} />
      </>
    );
  }

  return (
    <>
      <SummarySkeleton />
      <TableSkeleton />
    </>
  );
}
