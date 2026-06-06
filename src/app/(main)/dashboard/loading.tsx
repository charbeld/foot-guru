export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-white/10 rounded-lg" />
        <div className="h-4 w-48 bg-white/5 rounded-lg" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/[0.04] border border-white/10" />
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-24 rounded-2xl bg-white/[0.04] border border-white/10" />
        <div className="h-24 rounded-2xl bg-white/[0.04] border border-white/10" />
      </div>

      <div className="h-64 rounded-2xl bg-white/[0.04] border border-white/10" />
    </div>
  )
}
