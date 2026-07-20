function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 bg-[length:200%_100%] ${className || ''}`}
    />
  );
}

export function InventorySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading inventory">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Shimmer className="h-9 w-48" />
          <Shimmer className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Shimmer className="h-11 w-32" />
          <Shimmer className="h-11 w-28" />
          <Shimmer className="h-11 w-28" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Shimmer key={i} className="h-[148px]" />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-20" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Shimmer className="h-72" />
        <Shimmer className="h-72" />
      </div>

      <div className="space-y-3">
        <Shimmer className="h-24" />
        <Shimmer className="h-96" />
      </div>
    </div>
  );
}
