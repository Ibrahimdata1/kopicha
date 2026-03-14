export default function PosLoading() {
  return (
    <div className="p-4 sm:p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-9 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
