'use client'

import { useState, useEffect } from 'react'
import { Match, Prediction, PredictionOutcome } from '@/types'
import { cn, formatKickoff, isPredictionLocked, timeUntilKickoff } from '@/lib/utils'
import { STAGE_LABELS, calculateScore } from '@/lib/scoring'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'

interface MatchCardProps {
  match: Match
  prediction?: Prediction
  onPredict?: (matchId: string, outcome: PredictionOutcome, home: number | null, away: number | null) => Promise<void>
}

function outcomeFromScore(home: string, away: string): PredictionOutcome | null {
  const h = parseInt(home), a = parseInt(away)
  if (isNaN(h) || isNaN(a)) return null
  return h > a ? 'home' : h < a ? 'away' : 'draw'
}

export function MatchCard({ match, prediction, onPredict }: MatchCardProps) {
  const alreadySaved = !!prediction

  const [outcome, setOutcome]     = useState<PredictionOutcome | null>(prediction?.predicted_outcome ?? null)
  const [homeGoals, setHomeGoals] = useState<string>(prediction?.predicted_home?.toString() ?? '')
  const [awayGoals, setAwayGoals] = useState<string>(prediction?.predicted_away?.toString() ?? '')
  const [saving, setSaving]       = useState(false)
  const [committed, setCommitted] = useState(alreadySaved)

  const kickoffLocked = isPredictionLocked(match.kickoff_at)
  const isTBD         = !match.home_team_id || !match.away_team_id
  const isEditable    = !kickoffLocked && !committed && !isTBD
  const isFinished    = match.status === 'finished'

  // Mirror outcome from exact score input
  useEffect(() => {
    if (!isEditable) return
    const derived = outcomeFromScore(homeGoals, awayGoals)
    if (derived) setOutcome(derived)
  }, [homeGoals, awayGoals, isEditable])

  const handleScoreChange = (side: 'home' | 'away', val: string) => {
    if (side === 'home') setHomeGoals(val)
    else setAwayGoals(val)
  }

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
      setCommitted(true)
    } finally {
      setSaving(false)
    }
  }

  // Live points preview based on current selection
  const pointsPreview = (() => {
    if (!outcome) return null
    const hasScore = homeGoals !== '' && awayGoals !== ''
    const stageMult = { group:1, round_of_32:1.25, round_of_16:1.5, quarter_final:2, semi_final:2.5, third_place:2, final:3 }[match.stage] ?? 1
    const favoriteIsHome = match.home_elo >= match.away_elo
    const pickedUnderdog = (favoriteIsHome && outcome === 'away') || (!favoriteIsHome && outcome === 'home')
    const gap = match.elo_gap
    const eloMult = pickedUnderdog ? (gap > 300 ? 3 : gap > 150 ? 2 : gap > 50 ? 1.5 : 1) : 1
    const base = 5 + (hasScore ? 8 : 0)
    const pts = Math.round(base * eloMult * stageMult)
    return { pts, eloMult, stageMult, hasScore }
  })()

  const actualOutcome: PredictionOutcome | null = isFinished
    ? (match.home_score! > match.away_score! ? 'home' : match.home_score! < match.away_score! ? 'away' : 'draw')
    : null

  const stageBadgeColor = {
    group:         'bg-blue-500/20 text-blue-300',
    round_of_32:   'bg-indigo-500/20 text-indigo-300',
    round_of_16:   'bg-purple-500/20 text-purple-300',
    quarter_final: 'bg-yellow-500/20 text-yellow-300',
    semi_final:    'bg-orange-500/20 text-orange-300',
    third_place:   'bg-teal-500/20 text-teal-300',
    final:         'bg-red-500/20 text-red-300',
  }[match.stage]

  return (
    <div className={cn(
      'rounded-2xl border bg-gradient-to-b from-white/5 to-white/[0.02] p-5 transition-all',
      isFinished     ? 'border-white/10' :
      kickoffLocked  ? 'border-yellow-500/20' :
      committed      ? 'border-green-500/30' :
                       'border-white/15 hover:border-green-500/30',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', stageBadgeColor)}>
          {STAGE_LABELS[match.stage]}{match.group_name ? ` · Group ${match.group_name}` : ''}
        </span>
        <div className="text-right">
          {isFinished ? (
            <span className="text-xs text-gray-500 font-medium">Finished</span>
          ) : kickoffLocked ? (
            <span className="text-xs text-yellow-400 font-medium">🔒 Locked</span>
          ) : committed ? (
            <span className="text-xs text-green-400 font-medium">✓ Predicted · {timeUntilKickoff(match.kickoff_at)}</span>
          ) : (
            <span className="text-xs text-green-400 font-medium">⏱ {timeUntilKickoff(match.kickoff_at)}</span>
          )}
          <p className="text-xs text-gray-500 mt-0.5">{formatKickoff(match.kickoff_at)}</p>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-4">
        {/* Home */}
        <div className="flex-1 flex flex-col items-center gap-2">
          {match.home_team?.flag_url ? (
            <Image src={match.home_team.flag_url} alt={match.home_team.name}
              width={48} height={32} className="rounded shadow-md object-cover" unoptimized />
          ) : (
            <div className="w-12 h-8 rounded bg-white/10 flex items-center justify-center text-gray-600 text-xs">TBD</div>
          )}
          <span className="text-sm font-semibold text-white text-center leading-tight">
            {match.home_team?.name ?? match.placeholder_home ?? 'TBD'}
          </span>
          {match.home_team && <span className="text-xs text-gray-500">ELO {match.home_elo}</span>}
        </div>

        {/* Score / VS */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          {isFinished ? (
            <div className="text-2xl font-black text-white tabular-nums">
              {match.home_score} – {match.away_score}
            </div>
          ) : (
            <div className="text-base font-bold text-gray-600">VS</div>
          )}
          {match.home_team && match.elo_gap > 50 && (
            <span className="text-xs text-orange-400 text-center">
              {match.elo_gap > 300 ? '🔥 Big upset' : match.elo_gap > 150 ? '⚡ Upset bonus' : '〰 Slight gap'}
            </span>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex flex-col items-center gap-2">
          {match.away_team?.flag_url ? (
            <Image src={match.away_team.flag_url} alt={match.away_team.name}
              width={48} height={32} className="rounded shadow-md object-cover" unoptimized />
          ) : (
            <div className="w-12 h-8 rounded bg-white/10 flex items-center justify-center text-gray-600 text-xs">TBD</div>
          )}
          <span className="text-sm font-semibold text-white text-center leading-tight">
            {match.away_team?.name ?? match.placeholder_away ?? 'TBD'}
          </span>
          {match.away_team && <span className="text-xs text-gray-500">ELO {match.away_elo}</span>}
        </div>
      </div>

      {/* ── Prediction UI (scheduled matches) ── */}
      {!isFinished && (
        <div className="mt-5 space-y-3">

          {/* Outcome buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(['home', 'draw', 'away'] as PredictionOutcome[]).map(o => (
              <button
                key={o}
                disabled={!isEditable}
                onClick={() => isEditable && setOutcome(o)}
                className={cn(
                  'py-2 px-1 rounded-lg text-xs font-semibold border transition-all truncate',
                  outcome === o
                    ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20'
                    : !isEditable
                    ? 'bg-white/5 text-gray-600 border-white/10 cursor-not-allowed'
                    : 'bg-white/5 text-gray-300 border-white/15 hover:bg-white/10 hover:border-white/25',
                )}
              >
                {o === 'home' ? (match.home_team?.name ?? 'Home win') :
                 o === 'away' ? (match.away_team?.name ?? 'Away win') : 'Draw'}
              </button>
            ))}
          </div>

          {/* Exact score */}
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" max="20" value={homeGoals}
              onChange={e => handleScoreChange('home', e.target.value)}
              placeholder="–" disabled={!isEditable}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-white text-center text-lg font-bold',
                'placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors',
                isEditable ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 cursor-not-allowed',
              )}
            />
            <span className="text-gray-500 font-bold text-lg shrink-0">:</span>
            <input
              type="number" min="0" max="20" value={awayGoals}
              onChange={e => handleScoreChange('away', e.target.value)}
              placeholder="–" disabled={!isEditable}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-white text-center text-lg font-bold',
                'placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors',
                isEditable ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 cursor-not-allowed',
              )}
            />
          </div>

          {/* Points preview */}
          {pointsPreview && (
            <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1.5">
                5 outcome
                {pointsPreview.hasScore && <span className="text-yellow-400">+8 exact</span>}
                {pointsPreview.eloMult > 1 && <span className="text-orange-400">×{pointsPreview.eloMult} upset</span>}
                {pointsPreview.stageMult > 1 && <span className="text-purple-400">×{pointsPreview.stageMult} stage</span>}
              </span>
              <span className="font-black text-white text-sm">{pointsPreview.pts} pts</span>
            </div>
          )}

          {/* Locked state — show their prediction read-only */}
          {committed && !kickoffLocked && (
            <p className="text-xs text-green-500 text-center">
              Prediction locked in — good luck! 🤞
            </p>
          )}
          {kickoffLocked && outcome && (
            <p className="text-xs text-yellow-500/80 text-center">
              You predicted: <strong>{outcome === 'home' ? (match.home_team?.name ?? 'Home win') : outcome === 'away' ? (match.away_team?.name ?? 'Away win') : 'Draw'}</strong>
              {homeGoals !== '' ? ` ${homeGoals}–${awayGoals}` : ''}
            </p>
          )}

          {/* Save button — only when editable and not yet saved */}
          {isEditable && (
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!outcome}
              className="w-full"
              size="sm"
            >
              Lock in prediction
            </Button>
          )}
        </div>
      )}

      {/* ── Result panel for finished matches ── */}
      {isFinished && prediction && (
        <div className={cn(
          'mt-4 rounded-xl p-3',
          prediction.outcome_correct
            ? 'bg-green-500/10 border border-green-500/20'
            : 'bg-red-500/10 border border-red-500/20',
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-semibold', prediction.outcome_correct ? 'text-green-400' : 'text-red-400')}>
                {prediction.outcome_correct ? '✓ Correct' : '✗ Wrong'}
              </span>
              {prediction.exact_score_correct && (
                <span className="text-xs text-yellow-400 font-semibold">⭐ Exact!</span>
              )}
            </div>
            <span className="text-lg font-black text-white">+{prediction.points_earned ?? 0} pts</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            You predicted:{' '}
            <span className="text-gray-300">
              {prediction.predicted_outcome === 'home' ? (match.home_team?.name ?? 'Home win') :
               prediction.predicted_outcome === 'away' ? (match.away_team?.name ?? 'Away win') : 'Draw'}
              {prediction.predicted_home !== null ? ` ${prediction.predicted_home}–${prediction.predicted_away}` : ''}
            </span>
          </p>
        </div>
      )}

      {/* No prediction on a finished match */}
      {isFinished && !prediction && (
        <div className="mt-4 rounded-xl p-3 bg-white/5 border border-white/10 text-center">
          <p className="text-xs text-gray-500">No prediction made — 0 pts</p>
        </div>
      )}

      {/* Wikipedia source link */}
      {match.wiki_url && (
        <div className="mt-3 flex justify-end">
          <a
            href={match.wiki_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
            </svg>
            Wikipedia
          </a>
        </div>
      )}
    </div>
  )
}
