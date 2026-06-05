import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { cn, formatKickoff } from '@/lib/utils'
import type { Match, MatchStage } from '@/types'

export const revalidate = 300

const STAGE_ORDER: MatchStage[] = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final']
const STAGE_LABELS: Record<MatchStage, string> = {
  group:         'Group Stage',
  round_of_32:   'Round of 32',
  round_of_16:   'Round of 16',
  quarter_final: 'Quarter-Finals',
  semi_final:    'Semi-Finals',
  third_place:   'Third Place',
  final:         'Final',
}
const STAGE_MULT: Record<MatchStage, number> = {
  group:1, round_of_32:1.25, round_of_16:1.5, quarter_final:2, semi_final:2.5, third_place:2, final:3,
}
const STAGE_COLOR: Record<MatchStage, string> = {
  group:         'border-blue-500/30 bg-blue-500/5',
  round_of_32:   'border-indigo-500/30 bg-indigo-500/5',
  round_of_16:   'border-purple-500/30 bg-purple-500/5',
  quarter_final: 'border-yellow-500/30 bg-yellow-500/5',
  semi_final:    'border-orange-500/30 bg-orange-500/5',
  third_place:   'border-teal-500/30 bg-teal-500/5',
  final:         'border-red-500/30 bg-red-500/5',
}

function MatchTile({ match }: { match: Match }) {
  const isTBD = !match.home_team_id || !match.away_team_id
  const isFinished = match.status === 'finished'

  const homeWon = isFinished && match.home_score! > match.away_score!
  const awayWon = isFinished && match.away_score! > match.home_score!

  function TeamRow({ side }: { side: 'home' | 'away' }) {
    const team = side === 'home' ? match.home_team : match.away_team
    const placeholder = side === 'home' ? match.placeholder_home : match.placeholder_away
    const score = side === 'home' ? match.home_score : match.away_score
    const won = side === 'home' ? homeWon : awayWon

    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2',
        won ? 'bg-green-500/10' : '',
      )}>
        {team?.flag_url ? (
          <Image src={team.flag_url} alt={team.name} width={22} height={15}
            className="rounded object-cover shrink-0" unoptimized />
        ) : (
          <div className="w-6 h-4 rounded bg-white/10 shrink-0" />
        )}
        <span className={cn(
          'flex-1 text-sm font-semibold truncate',
          isTBD ? 'text-gray-500 text-xs' : won ? 'text-white' : 'text-gray-300',
        )}>
          {team?.name ?? placeholder ?? 'TBD'}
        </span>
        {isFinished && (
          <span className={cn('text-sm font-black tabular-nums', won ? 'text-white' : 'text-gray-500')}>
            {score}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden text-sm transition-all',
      STAGE_COLOR[match.stage as MatchStage],
      isTBD ? 'opacity-60' : 'hover:opacity-90',
    )}>
      <TeamRow side="home" />
      <div className="border-t border-white/10" />
      <TeamRow side="away" />
      <div className="px-3 py-1.5 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-gray-600">{formatKickoff(match.kickoff_at)}</span>
        <span className="text-xs text-gray-600 font-semibold">×{STAGE_MULT[match.stage as MatchStage]}</span>
      </div>
    </div>
  )
}

export default async function BracketPage() {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
    .in('stage', STAGE_ORDER)
    .order('kickoff_at', { ascending: true })

  // Group by stage
  const byStage: Record<string, Match[]> = {}
  for (const m of matches ?? []) {
    if (!byStage[m.stage]) byStage[m.stage] = []
    byStage[m.stage].push(m)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Knockout Bracket</h1>
        <p className="text-gray-500 text-sm mt-1">
          Teams update automatically as each round is decided · Predict once teams are confirmed
        </p>
      </div>

      {STAGE_ORDER.map(stage => {
        const stageMatches = byStage[stage] ?? []
        if (!stageMatches.length) return null

        const confirmedCount = stageMatches.filter(m => m.home_team_id && m.away_team_id).length
        const total = stageMatches.length

        return (
          <div key={stage}>
            {/* Stage header */}
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-black text-white">{STAGE_LABELS[stage]}</h2>
              <span className="text-xs text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                ×{STAGE_MULT[stage]} pts
              </span>
              {confirmedCount < total && (
                <span className="text-xs text-gray-600">
                  {confirmedCount}/{total} teams confirmed
                </span>
              )}
              {confirmedCount === total && (
                <span className="text-xs text-green-500 font-semibold">✓ All teams confirmed</span>
              )}
            </div>

            {/* Match grid */}
            <div className={cn(
              'grid gap-3',
              stage === 'round_of_32'   ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
              stage === 'round_of_16'   ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
              stage === 'quarter_final' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
              stage === 'semi_final'    ? 'grid-cols-1 sm:grid-cols-2' :
              stage === 'third_place'   ? 'grid-cols-1 max-w-sm' :
                                          'grid-cols-1 max-w-sm mx-auto',
            )}>
              {stageMatches.map(m => <MatchTile key={m.id} match={m} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
