export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-52 bg-white/10 rounded-lg" />
        <div className="h-4 w-48 bg-white/5 rounded-lg" />
      </div>

      {/* Rank callout */}
      <div className="h-20 rounded-2xl bg-green-500/5 border border-green-500/10" />

      {/* Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="h-10 bg-white/[0.04] border-b border-white/10" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-white/5 last:border-0 bg-white/[0.02]" />
        ))}
      </div>
    </div>
  )
}
