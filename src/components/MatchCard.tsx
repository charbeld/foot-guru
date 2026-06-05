'use client'

import { useState } from 'react'
import { Match, Prediction, PredictionOutcome } from '@/types'
import { cn, formatKickoff, isPredictionLocked, timeUntilKickoff } from '@/lib/utils'
import { STAGE_LABELS, maxPointsForMatch } from '@/lib/scoring'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'

interface MatchCardProps {
  match: Match
  prediction?: Prediction
  onPredict?: (matchId: string, outcome: PredictionOutcome, home: number | null, away: number | null) => Promise<void>
}

export function MatchCard({ match, prediction, onPredict }: MatchCardProps) {
  const [outcome, setOutcome]       = useState<PredictionOutcome | null>(prediction?.predicted_outcome ?? null)
  const [homeGoals, setHomeGoals]   = useState<string>(prediction?.predicted_home?.toString() ?? '')
  const [awayGoals, setAwayGoals]   = useState<string>(prediction?.predicted_away?.toString() ?? '')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  const locked = isPredictionLocked(match.kickoff_at)
  const isFinished = match.status === 'finished'
  const maxPts = maxPointsForMatch(match.stage, match.elo_gap)

  const handleSave = async () => {
    if (!outcome || !onPredict) return
    setSaving(true)
    try {
      await onPredict(
        match.id,
        outcome,
        homeGoals !== '' ? parseInt(homeGoals) : null,
        awayGoals !== '' ? parseInt(awayGoals) : null,
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const actualOutcome: PredictionOutcome | null = isFinished
    ? (match.home_score! > match.away_score! ? 'home' : match.home_score! < match.away_score! ? 'away' : 'draw')
    : null

  const stageBadgeColor = {
    group: 'bg-blue-500/20 text-blue-300',
    round_of_16: 'bg-purple-500/20 text-purple-300',
    quarter_final: 'bg-yellow-500/20 text-yellow-300',
    semi_final: 'bg-orange-500/20 text-orange-300',
    third_place: 'bg-teal-500/20 text-teal-300',
    final: 'bg-red-500/20 text-red-300',
  }[match.stage]

  return (
    <div className={cn(
      'relative rounded-2xl border bg-gradient-to-b from-white/5 to-white/[0.02] p-5 transition-all',
      isFinished ? 'border-white/10' : locked ? 'border-yellow-500/20' : 'border-white/15 hover:border-green-500/30',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', stageBadgeColor)}>
          {STAGE_LABELS[match.stage]}{match.group_name ? ` · Group ${match.group_name}` : ''}
        </span>
        <div className="text-right">
          {locked ? (
            <span className="text-xs text-yellow-400 font-medium">🔒 Locked</span>
          ) : (
            <span className="text-xs text-green-400 font-medium">⏱ {timeUntilKickoff(match.kickoff_at)}</span>
          )}
          <p className="text-xs text-gray-500 mt-0.5">{formatKickoff(match.kickoff_at)}</p>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-4">
        {/* Home team */}
        <div className="flex-1 flex flex-col items-center gap-2">
          {match.home_team?.flag_url && (
            <Image src={match.home_team.flag_url} alt={match.home_team.name} width={48} height={32}
              className="rounded shadow-md object-cover" />
          )}
          <span className="text-sm font-semibold text-white text-center">{match.home_team?.name}</span>
          <span className="text-xs text-gray-500">ELO {match.home_elo}</span>
        </div>

        {/* Score / vs */}
        <div className="flex flex-col items-center gap-1">
          {isFinished ? (
            <div className="text-2xl font-bold text-white tabular-nums">
              {match.home_score} – {match.away_score}
            </div>
          ) : (
            <div className="text-lg font-bold text-gray-600">VS</div>
          )}
          {match.elo_gap > 50 && (
            <span className="text-xs text-orange-400">
              {match.elo_gap > 300 ? '🔥 Big upset potential' :
               match.elo_gap > 150 ? '⚡ Upset bonus' : '〰 Slight gap'}
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex flex-col items-center gap-2">
          {match.away_team?.flag_url && (
            <Image src={match.away_team.flag_url} alt={match.away_team.name} width={48} height={32}
              className="rounded shadow-md object-cover" />
          )}
          <span className="text-sm font-semibold text-white text-center">{match.away_team?.name}</span>
          <span className="text-xs text-gray-500">ELO {match.away_elo}</span>
        </div>
      </div>

      {/* Prediction UI */}
      {!isFinished && (
        <div className="mt-5 space-y-3">
          {/* Outcome buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(['home', 'draw', 'away'] as PredictionOutcome[]).map(o => (
              <button
                key={o}
                disabled={locked}
                onClick={() => !locked && setOutcome(o)}
                className={cn(
                  'py-2 rounded-lg text-sm font-semibold border transition-all',
                  outcome === o
                    ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20'
                    : locked
                    ? 'bg-white/5 text-gray-600 border-white/10 cursor-not-allowed'
                    : 'bg-white/5 text-gray-300 border-white/15 hover:bg-white/10 hover:border-white/25',
                )}
              >
                {o === 'home' ? match.home_team?.code ?? 'Home' :
                 o === 'away' ? match.away_team?.code ?? 'Away' : 'Draw'}
              </button>
            ))}
          </div>

          {/* Exact score (optional) */}
          {!locked && (
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" max="20" value={homeGoals}
                onChange={e => setHomeGoals(e.target.value)}
                placeholder="–" disabled={locked}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white text-center
                  placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-bold"
              />
              <span className="text-gray-500 font-bold text-lg shrink-0">:</span>
              <input
                type="number" min="0" max="20" value={awayGoals}
                onChange={e => setAwayGoals(e.target.value)}
                placeholder="–" disabled={locked}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white text-center
                  placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-bold"
              />
              <span className="text-xs text-gray-500 shrink-0 ml-1">optional<br/>+8 pts</span>
            </div>
          )}

          {/* Save button */}
          {!locked && (
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!outcome}
              className="w-full"
              size="sm"
            >
              {saved ? '✓ Saved!' : 'Save Prediction'}
            </Button>
          )}
        </div>
      )}

      {/* Result for finished matches */}
      {isFinished && prediction && (
        <div className={cn(
          'mt-4 rounded-xl p-3 text-center',
          prediction.outcome_correct ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20',
        )}>
          <div className="flex items-center justify-center gap-3">
            <span className={cn('text-sm font-semibold', prediction.outcome_correct ? 'text-green-400' : 'text-red-400')}>
              {prediction.outcome_correct ? '✓ Correct' : '✗ Wrong'}
            </span>
            {prediction.exact_score_correct && (
              <span className="text-sm text-yellow-400 font-semibold">⭐ Exact score!</span>
            )}
            <span className="text-sm font-bold text-white">
              +{prediction.points_earned ?? 0} pts
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            You predicted: {prediction.predicted_outcome === 'home' ? match.home_team?.code : prediction.predicted_outcome === 'away' ? match.away_team?.code : 'Draw'}
            {prediction.predicted_home !== null ? ` ${prediction.predicted_home}–${prediction.predicted_away}` : ''}
          </p>
        </div>
      )}

      {/* Max points badge */}
      <div className="absolute top-4 right-4 -mt-1">
        <span className="text-xs text-gray-600">up to {maxPts} pts</span>
      </div>
    </div>
  )
}
