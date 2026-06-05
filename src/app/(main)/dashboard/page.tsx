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
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-6">
        <h2 className="font-bold text-white">How Points Work</h2>

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

        {/* Real examples */}
        <div className="border-t border-white/10 pt-5">
          <div className="text-sm font-semibold text-gray-400 mb-3">Real examples</div>
          <div className="space-y-3">
            {[
              {
                label: 'Spain vs Qatar · Group Stage',
                flags: ['🇪🇸','🇶🇦'],
                scenario: 'You predict Spain win (favourite, ELO gap 732)',
                calc: '5 × 1.0 × 1.0',
                pts: 5,
                color: 'text-green-400',
                note: 'No upset bonus — you picked the favourite',
              },
              {
                label: 'Morocco vs Netherlands · Group Stage',
                flags: ['🇲🇦','🇳🇱'],
                scenario: 'You predict Morocco win + exact score 1–0 (ELO gap 120)',
                calc: '(5 + 8) × 1.5 × 1.0',
                pts: 20,
                color: 'text-orange-400',
                note: 'Slight upset bonus applied',
              },
              {
                label: 'Argentina vs Germany · Quarter-Final',
                flags: ['🇦🇷','🇩🇪'],
                scenario: 'You predict Germany win (ELO gap 188, big upset)',
                calc: '5 × 2.0 × 2.0',
                pts: 20,
                color: 'text-yellow-400',
                note: 'Upset + Quarter-Final multipliers stack',
              },
              {
                label: 'Spain vs Argentina · Final',
                flags: ['🇪🇸','🇦🇷'],
                scenario: 'You predict Argentina win + exact score 2–1 (ELO gap 42)',
                calc: '(5 + 8) × 1.0 × 3.0',
                pts: 39,
                color: 'text-red-400',
                note: 'ELO gap too small for upset bonus — but it\'s the Final!',
              },
              {
                label: 'Saudi Arabia vs France · Round of 16',
                flags: ['🇸🇦','🇫🇷'],
                scenario: 'You predict Saudi Arabia win (ELO gap 496, massive upset!)',
                calc: '5 × 3.0 × 1.5',
                pts: 23,
                color: 'text-red-400',
                note: 'Maximum upset multiplier. Brave call.',
              },
            ].map((ex, i) => (
              <div key={i} className="bg-white/[0.03] rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>{ex.flags[0]}</span><span>{ex.flags[1]}</span>
                    <span className="text-xs font-semibold text-gray-300 ml-1">{ex.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{ex.scenario}</p>
                  <p className="text-xs text-gray-600 italic">{ex.note}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-500 font-mono">{ex.calc}</div>
                  <div className={`text-xl font-black ${ex.color}`}>{ex.pts} pts</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
