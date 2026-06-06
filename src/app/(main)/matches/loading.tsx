export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-white/10 rounded-lg" />
          <div className="h-4 w-52 bg-white/5 rounded-lg" />
        </div>
        <div className="h-4 w-28 bg-white/5 rounded-lg" />
      </div>

      {/* Stage filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-lg bg-white/[0.06]" />
        ))}
      </div>

      {/* Day groups */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 rounded-2xl bg-white/[0.04] border border-white/10" />
        ))}
      </div>
    </div>
  )
}
