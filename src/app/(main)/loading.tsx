export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Page title skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/10 rounded-lg" />
        <div className="h-4 w-64 bg-white/5 rounded-lg" />
      </div>

      {/* Content rows */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-2xl bg-white/[0.04] border border-white/10" />
        ))}
      </div>
    </div>
  )
}
