import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: recentPredictions }, { data: leaderboard }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase
      .from('predictions')
      .select('*, match:matches(*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*))')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('global_leaderboard')
      .select('rank')
      .eq('id', user!.id)
      .single(),
  ])

  const totalPredictions = recentPredictions?.length ?? 0
  const correctPredictions = recentPredictions?.filter(p => p.outcome_correct).length ?? 0
  const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-black text-white">
          Welcome back, <span className="text-green-400">{profile?.display_name ?? 'Player'}</span> 👋
        </h1>
        <p className="text-gray-500 mt-1">World Cup 2026 · Prediction Challenge</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Points', value: profile?.total_points ?? 0, icon: '🏆', color: 'text-yellow-400' },
          { label: 'Global Rank', value: leaderboard?.rank ? `#${leaderboard.rank}` : '–', icon: '📊', color: 'text-blue-400' },
          { label: 'Predictions', value: totalPredictions, icon: '🎯', color: 'text-purple-400' },
          { label: 'Accuracy', value: `${accuracy}%`, icon: '✅', color: 'text-green-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white/5 rounded-2xl border border-white/10 p-5">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/matches"
          className="group flex items-center gap-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-2xl p-5 transition-all">
          <span className="text-3xl">⚽</span>
          <div>
            <div className="font-bold text-white group-hover:text-green-400 transition-colors">Make Predictions</div>
            <div className="text-sm text-gray-500">Pick match outcomes</div>
          </div>
        </Link>
        <Link href="/leaderboard"
          className="group flex items-center gap-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-2xl p-5 transition-all">
          <span className="text-3xl">🏆</span>
          <div>
            <div className="font-bold text-white group-hover:text-yellow-400 transition-colors">Leaderboard</div>
            <div className="text-sm text-gray-500">See global rankings</div>
          </div>
        </Link>
        <Link href="/leagues"
          className="group flex items-center gap-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-2xl p-5 transition-all">
          <span className="text-3xl">👥</span>
          <div>
            <div className="font-bold text-white group-hover:text-purple-400 transition-colors">Private Leagues</div>
            <div className="text-sm text-gray-500">Compete with friends</div>
          </div>
        </Link>
      </div>

      {/* Scoring guide */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
        <h2 className="font-bold text-white mb-4">How Points Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-green-400 font-semibold mb-2">Base Points</div>
            <div className="space-y-1 text-gray-400">
              <div className="flex justify-between"><span>Correct outcome</span><span className="text-white font-bold">5 pts</span></div>
              <div className="flex justify-between"><span>Exact score bonus</span><span className="text-white font-bold">+8 pts</span></div>
            </div>
          </div>
          <div>
            <div className="text-orange-400 font-semibold mb-2">Upset Multiplier</div>
            <div className="space-y-1 text-gray-400">
              <div className="flex justify-between"><span>ELO gap 51–150</span><span className="text-white font-bold">×1.5</span></div>
              <div className="flex justify-between"><span>ELO gap 151–300</span><span className="text-white font-bold">×2.0</span></div>
              <div className="flex justify-between"><span>ELO gap 300+</span><span className="text-white font-bold">×3.0</span></div>
            </div>
          </div>
          <div>
            <div className="text-purple-400 font-semibold mb-2">Stage Multiplier</div>
            <div className="space-y-1 text-gray-400">
              <div className="flex justify-between"><span>Group Stage</span><span className="text-white font-bold">×1.0</span></div>
              <div className="flex justify-between"><span>Round of 16</span><span className="text-white font-bold">×1.5</span></div>
              <div className="flex justify-between"><span>Quarter-Final</span><span className="text-white font-bold">×2.0</span></div>
              <div className="flex justify-between"><span>Semi-Final</span><span className="text-white font-bold">×2.5</span></div>
              <div className="flex justify-between"><span>Final</span><span className="text-white font-bold">×3.0</span></div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500">
          Example: Correct outcome in a Final with big upset → (5 + 8) × 3.0 × 3.0 = <span className="text-yellow-400 font-bold">117 pts</span>
        </div>
      </div>
    </div>
  )
}
