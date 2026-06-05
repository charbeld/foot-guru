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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="text-sm text-gray-500">See global rankings & predictions</div>
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
              <div className="flex justify-between">
                <span>Correct outcome</span>
                <span className="text-white font-bold">5 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Exact score bonus</span>
                <span className="text-white font-bold">+8 pts</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Exact score only counts if your outcome is also correct.
              </p>
            </div>
          </div>
          <div>
            <div className="text-orange-400 font-semibold mb-2">Upset Multiplier</div>
            <div className="space-y-1 text-gray-400">
              <div className="flex justify-between"><span>ELO gap ≤ 50</span><span className="text-white font-bold">×1.0</span></div>
              <div className="flex justify-between"><span>ELO gap 51–150</span><span className="text-white font-bold">×1.5</span></div>
              <div className="flex justify-between"><span>ELO gap 151–300</span><span className="text-white font-bold">×2.0</span></div>
              <div className="flex justify-between"><span>ELO gap 300+</span><span className="text-white font-bold">×3.0</span></div>
              <p className="text-xs text-gray-600 mt-2">Only applies when you correctly pick the underdog (lower-ELO team).</p>
            </div>
          </div>
          <div>
            <div className="text-purple-400 font-semibold mb-2">Stage Multiplier</div>
            <div className="space-y-1 text-gray-400">
              <div className="flex justify-between"><span>Group Stage</span><span className="text-white font-bold">×1.0</span></div>
              <div className="flex justify-between"><span>Round of 32</span><span className="text-white font-bold">×1.25</span></div>
              <div className="flex justify-between"><span>Round of 16</span><span className="text-white font-bold">×1.5</span></div>
              <div className="flex justify-between"><span>Quarter-Final</span><span className="text-white font-bold">×2.0</span></div>
              <div className="flex justify-between"><span>Semi-Final</span><span className="text-white font-bold">×2.5</span></div>
              <div className="flex justify-between"><span>Final</span><span className="text-white font-bold">×3.0</span></div>
            </div>
          </div>
        </div>

        {/* Formula */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Points formula</p>
          <p className="text-sm font-mono text-white">
            (5 + <span className="text-yellow-400">8 if exact</span>) × <span className="text-orange-400">upset mult</span> × <span className="text-purple-400">stage mult</span>
          </p>
        </div>

        {/* Examples */}
        <div className="border-t border-white/10 pt-5 space-y-4">
          <div className="text-sm font-semibold text-gray-400">Worked examples</div>

          {[
            {
              matchup: 'Spain vs Qatar',
              stage: 'Group Stage',
              flags: ['🇪🇸', '🇶🇦'],
              scenario: 'You predict Spain to win. Spain are heavy favourites (ELO gap 732).',
              steps: [
                { label: 'Correct outcome', value: '5 pts', color: 'text-green-400' },
                { label: 'No exact score predicted', value: '+0 pts', color: 'text-gray-600' },
                { label: 'You picked the favourite — no upset bonus', value: '×1.0', color: 'text-gray-600' },
                { label: 'Group Stage multiplier', value: '×1.0', color: 'text-gray-500' },
              ],
              formula: '5 × 1.0 × 1.0',
              result: 5,
              resultColor: 'text-green-400',
              note: 'Picking favourites earns the minimum — safe but low reward.',
            },
            {
              matchup: 'Morocco vs Netherlands',
              stage: 'Group Stage',
              flags: ['🇲🇦', '🇳🇱'],
              scenario: 'You predict Morocco to win 1–0 (Morocco are the underdogs, ELO gap 120).',
              steps: [
                { label: 'Correct outcome', value: '5 pts', color: 'text-green-400' },
                { label: 'Exact score correct (1–0)', value: '+8 pts', color: 'text-yellow-400' },
                { label: 'ELO gap 120 → slight upset bonus', value: '×1.5', color: 'text-orange-400' },
                { label: 'Group Stage multiplier', value: '×1.0', color: 'text-gray-500' },
              ],
              formula: '(5 + 8) × 1.5 × 1.0',
              result: 20,
              resultColor: 'text-orange-400',
              note: 'Exact score + picking the underdog stacks nicely, even at group stage.',
            },
            {
              matchup: 'Argentina vs Germany',
              stage: 'Quarter-Final',
              flags: ['🇦🇷', '🇩🇪'],
              scenario: 'You predict Germany to win. Germany are underdogs (ELO gap 188).',
              steps: [
                { label: 'Correct outcome', value: '5 pts', color: 'text-green-400' },
                { label: 'No exact score predicted', value: '+0 pts', color: 'text-gray-600' },
                { label: 'ELO gap 188 → big upset bonus', value: '×2.0', color: 'text-orange-400' },
                { label: 'Quarter-Final multiplier', value: '×2.0', color: 'text-purple-400' },
              ],
              formula: '5 × 2.0 × 2.0',
              result: 20,
              resultColor: 'text-yellow-400',
              note: 'Upset bonus and stage multiplier both apply — knockout rounds are where upsets really pay off.',
            },
            {
              matchup: 'Spain vs Argentina',
              stage: 'Final',
              flags: ['🇪🇸', '🇦🇷'],
              scenario: 'You predict Argentina to win 2–1. ELO gap is only 42 — teams are evenly matched.',
              steps: [
                { label: 'Correct outcome', value: '5 pts', color: 'text-green-400' },
                { label: 'Exact score correct (2–1)', value: '+8 pts', color: 'text-yellow-400' },
                { label: 'ELO gap 42 — too small for upset bonus', value: '×1.0', color: 'text-gray-600' },
                { label: 'Final multiplier', value: '×3.0', color: 'text-purple-400' },
              ],
              formula: '(5 + 8) × 1.0 × 3.0',
              result: 39,
              resultColor: 'text-red-400',
              note: 'Getting the Final exact score is a massive payoff even without an upset bonus.',
            },
            {
              matchup: 'Saudi Arabia vs France',
              stage: 'Round of 16',
              flags: ['🇸🇦', '🇫🇷'],
              scenario: 'You predict Saudi Arabia to win 2–1 (massive upset — ELO gap 496!).',
              steps: [
                { label: 'Correct outcome', value: '5 pts', color: 'text-green-400' },
                { label: 'Exact score correct (2–1)', value: '+8 pts', color: 'text-yellow-400' },
                { label: 'ELO gap 496 → maximum upset bonus', value: '×3.0', color: 'text-orange-400' },
                { label: 'Round of 16 multiplier', value: '×1.5', color: 'text-purple-400' },
              ],
              formula: '(5 + 8) × 3.0 × 1.5',
              result: 59,
              resultColor: 'text-red-400',
              note: 'The highest possible reward — a correct exact score on a massive knockout upset.',
            },
          ].map((ex, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
              {/* Match header */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg">{ex.flags[0]}</span>
                <span className="text-xs font-black text-white">{ex.matchup}</span>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-500">{ex.stage}</span>
              </div>

              {/* Scenario */}
              <p className="text-xs text-gray-400">{ex.scenario}</p>

              {/* Step-by-step breakdown */}
              <div className="bg-black/30 rounded-lg p-3 space-y-1.5">
                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Point breakdown</div>
                {ex.steps.map((step, j) => (
                  <div key={j} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span className="text-gray-700">{'→'}</span>
                      {step.label}
                    </span>
                    <span className={`text-xs font-bold shrink-0 ${step.color}`}>{step.value}</span>
                  </div>
                ))}
                <div className="border-t border-white/5 mt-2 pt-2 flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-500">{ex.formula}</span>
                  <span className={`text-xl font-black ${ex.resultColor}`}>{ex.result} pts</span>
                </div>
              </div>

              {/* Note */}
              <p className="text-xs text-gray-600 italic">{ex.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
