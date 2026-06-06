'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn, formatKickoff } from '@/lib/utils'
import { STAGE_LABELS } from '@/lib/scoring'
import type { MatchStage, PredictionOutcome } from '@/types'

interface Leader {
  id: string
  username: string
  display_name: string | null
  total_points: number
  rank: number
}

interface Prediction {
  id: string
  predicted_outcome: PredictionOutcome
  predicted_home: number | null
  predicted_away: number | null
  outcome_correct: boolean | null
  exact_score_correct: boolean | null
  points_earned: number | null
  elo_multiplier: number | null
  match: {
    id: string
    stage: MatchStage
    kickoff_at: string
    home_score: number | null
    away_score: number | null
    status: string
    elo_gap: number
    stage_multiplier: number
    home_team: { name: string; flag_url: string | null } | null
    away_team: { name: string; flag_url: string | null } | null
  } | null
}

interface LeaderboardClientProps {
  leaders: Leader[]
  currentUserId: string
}

function rankBadge(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

function outcomeLabel(outcome: PredictionOutcome, homeName: string, awayName: string) {
  if (outcome === 'home') return `${homeName} win`
  if (outcome === 'away') return `${awayName} win`
  return 'Draw'
}

// ─── Breakdown explanation for each prediction ────────────────────────────────
function PointsBreakdown({ pred }: { pred: Prediction }) {
  const m = pred.match
  if (!m) return null

  const isFinished = m.status === 'finished'
  if (!isFinished) {
    return <span className="text-xs text-gray-600 italic">Match not yet played</span>
  }

  if (pred.outcome_correct === false) {
    return <span className="text-xs text-red-400">Wrong outcome — 0 pts</span>
  }

  if (pred.outcome_correct === null) {
    return <span className="text-xs text-gray-600">Awaiting result</span>
  }

  const parts: { label: string; value: string; color: string }[] = []
  parts.push({ label: 'Correct outcome', value: '5 pts', color: 'text-green-400' })

  if (pred.exact_score_correct) {
    parts.push({ label: 'Exact score bonus', value: '+8 pts', color: 'text-yellow-400' })
  }

  const elo = pred.elo_multiplier ?? 1
  if (elo > 1) {
    const eloGap = m.elo_gap
    const gapLabel = eloGap > 300 ? 'ELO gap 300+ (massive upset)' :
                     eloGap > 150 ? `ELO gap ${eloGap} (big upset)` :
                     `ELO gap ${eloGap} (slight upset)`
    parts.push({ label: gapLabel, value: `×${elo} upset`, color: 'text-orange-400' })
  }

  const stageMult = m.stage_multiplier ?? 1
  if (stageMult > 1) {
    parts.push({ label: STAGE_LABELS[m.stage], value: `×${stageMult} stage`, color: 'text-purple-400' })
  }

  const pts = pred.points_earned ?? 0
  const base = 5 + (pred.exact_score_correct ? 8 : 0)
  const calcStr = elo > 1 || stageMult > 1
    ? `(${base}) × ${elo} × ${stageMult} = ${pts} pts`
    : `${base} pts`

  return (
    <div className="space-y-0.5">
      {parts.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-gray-600 text-[10px]">·</span>
          <span className="text-[10px] text-gray-500">{p.label}</span>
          <span className={cn('text-[10px] font-bold ml-auto', p.color)}>{p.value}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 pt-0.5 border-t border-white/5 mt-1">
        <span className="text-[10px] text-gray-600 font-mono">{calcStr}</span>
        <span className={cn('text-xs font-black ml-auto', pts > 0 ? 'text-white' : 'text-gray-500')}>
          {pts > 0 ? `+${pts}` : '0'} pts
        </span>
      </div>
    </div>
  )
}

// ─── User predictions drawer ──────────────────────────────────────────────────
function UserPredictionsPanel({
  leader, currentUserId, onClose,
}: {
  leader: Leader
  currentUserId: string
  onClose: () => void
}) {
  const isMe = leader.id === currentUserId
  const [predictions, setPredictions] = useState<Prediction[] | null>(null)
  const [hiddenPending, setHiddenPending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState(false)
  const [hideMyPending, setHideMyPending] = useState<boolean | null>(null)

  const load = async () => {
    if (predictions !== null) return
    setLoading(true)
    try {
      const res = await fetch(`/api/predictions/user?userId=${leader.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPredictions(data.predictions)
      setHiddenPending(data.hiddenPending ?? false)
      if (isMe) {
        // Fetch own privacy setting from profile
        const profileRes = await fetch(`/api/predictions/user?userId=${leader.id}`)
        // hiddenPending=false for self, so check via a separate flag
        // We infer it: if hiddenPending is false for self we still need the stored value
        // Use a dedicated endpoint — for now derive from data
        setHideMyPending(data.myHideSetting ?? false)
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  if (predictions === null && !loading && !error) { load() }

  const togglePrivacy = async () => {
    if (hideMyPending === null) return
    setToggling(true)
    const next = !hideMyPending
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hide_pending_predictions: next }),
      })
      if (!res.ok) throw new Error('Failed')
      setHideMyPending(next)
    } catch {}
    setToggling(false)
  }

  const finished = predictions?.filter(p => p.match?.status === 'finished') ?? []
  const pending  = predictions?.filter(p => p.match?.status !== 'finished') ?? []
  const correct  = finished.filter(p => p.outcome_correct).length

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#0d0d0d] border-l border-white/10 w-full max-w-md h-full overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0d0d0d]/95 backdrop-blur border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-bold text-white">
              {leader.display_name ?? leader.username}
              <span className="ml-1.5 text-sm text-gray-500">@{leader.username}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">All predictions</div>
          </div>
          <button onClick={onClose}
            className="text-gray-500 hover:text-white text-lg leading-none transition-colors">
            ✕
          </button>
        </div>

        {/* Privacy toggle — only shown for own profile */}
        {isMe && hideMyPending !== null && (
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Hide upcoming predictions</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Others won't see your picks before kickoff</div>
            </div>
            <button
              onClick={togglePrivacy}
              disabled={toggling}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors shrink-0 overflow-hidden',
                hideMyPending ? 'bg-green-500' : 'bg-white/20'
              )}
            >
              <span className={cn(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200',
                hideMyPending ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>
        )}

        {/* Summary bar */}
        {predictions && predictions.length > 0 && (
          <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
            <div className="px-4 py-3 text-center">
              <div className="text-lg font-black text-white">{leader.total_points}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Total pts</div>
            </div>
            <div className="px-4 py-3 text-center">
              <div className="text-lg font-black text-white">{predictions.length}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Predictions</div>
            </div>
            <div className="px-4 py-3 text-center">
              <div className="text-lg font-black text-white">
                {finished.length > 0 ? Math.round((correct / finished.length) * 100) : 0}%
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Accuracy</div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-3">
          {loading && (
            <div className="text-center py-12 text-gray-600">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-sm">Loading predictions…</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-400 text-sm">{error}</div>
          )}

          {predictions?.length === 0 && !hiddenPending && (
            <div className="text-center py-12 text-gray-600">
              <p className="text-sm">No predictions yet.</p>
            </div>
          )}

          {hiddenPending && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-sm text-gray-500">
              🔒 This player has hidden their upcoming predictions
            </div>
          )}

          {/* Finished matches */}
          {finished.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Completed matches
              </div>
              <div className="space-y-2">
                {finished.map(pred => {
                  const m = pred.match!
                  return (
                    <div key={pred.id} className={cn(
                      'rounded-xl border p-3 space-y-2',
                      pred.outcome_correct
                        ? 'bg-green-500/5 border-green-500/15'
                        : 'bg-red-500/5 border-red-500/15',
                    )}>
                      {/* Teams */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {m.home_team?.flag_url && (
                            <Image src={m.home_team.flag_url} alt={m.home_team.name}
                              width={16} height={11} className="rounded object-cover shrink-0" unoptimized />
                          )}
                          <span className="text-xs text-gray-300 truncate">{m.home_team?.name ?? 'TBD'}</span>
                        </div>
                        <div className="text-xs font-black text-white shrink-0">
                          {m.home_score} – {m.away_score}
                        </div>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                          <span className="text-xs text-gray-300 truncate text-right">{m.away_team?.name ?? 'TBD'}</span>
                          {m.away_team?.flag_url && (
                            <Image src={m.away_team.flag_url} alt={m.away_team.name}
                              width={16} height={11} className="rounded object-cover shrink-0" unoptimized />
                          )}
                        </div>
                      </div>

                      {/* Prediction */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-600">Predicted:</span>
                        <span className="text-gray-300 font-semibold">
                          {outcomeLabel(pred.predicted_outcome, m.home_team?.name ?? '?', m.away_team?.name ?? '?')}
                          {pred.predicted_home !== null
                            ? ` (${pred.predicted_home}–${pred.predicted_away})`
                            : ''}
                        </span>
                        <span className={cn('ml-auto text-xs font-bold',
                          pred.outcome_correct ? 'text-green-400' : 'text-red-400')}>
                          {pred.outcome_correct ? '✓ Correct' : '✗ Wrong'}
                          {pred.exact_score_correct ? ' ⭐ Exact' : ''}
                        </span>
                      </div>

                      {/* Points breakdown */}
                      <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
                        <PointsBreakdown pred={pred} />
                      </div>

                      {/* Stage + date */}
                      <div className="flex items-center justify-between text-[10px] text-gray-600">
                        <span>{STAGE_LABELS[m.stage]}</span>
                        <span>{formatKickoff(m.kickoff_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Pending predictions */}
          {pending.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-3">
                Upcoming predictions
              </div>
              <div className="space-y-2">
                {pending.map(pred => {
                  const m = pred.match
                  if (!m) return null
                  return (
                    <div key={pred.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {m.home_team?.flag_url && (
                            <Image src={m.home_team.flag_url} alt={m.home_team.name}
                              width={16} height={11} className="rounded object-cover shrink-0" unoptimized />
                          )}
                          <span className="text-xs text-gray-300 truncate">{m.home_team?.name ?? 'TBD'}</span>
                        </div>
                        <span className="text-xs text-gray-600 shrink-0">vs</span>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                          <span className="text-xs text-gray-300 truncate text-right">{m.away_team?.name ?? 'TBD'}</span>
                          {m.away_team?.flag_url && (
                            <Image src={m.away_team.flag_url} alt={m.away_team.name}
                              width={16} height={11} className="rounded object-cover shrink-0" unoptimized />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-600">Predicted:</span>
                        <span className="text-gray-300 font-semibold">
                          {outcomeLabel(pred.predicted_outcome, m.home_team?.name ?? '?', m.away_team?.name ?? '?')}
                          {pred.predicted_home !== null
                            ? ` (${pred.predicted_home}–${pred.predicted_away})`
                            : ''}
                        </span>
                        <span className="ml-auto text-[10px] text-gray-600">{STAGE_LABELS[m.stage]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main leaderboard client ──────────────────────────────────────────────────
export function LeaderboardClient({ leaders, currentUserId }: LeaderboardClientProps) {
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null)

  const currentUserRank = leaders.find(l => l.id === currentUserId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Global Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-1">Top 100 players · Click a player to see their predictions</p>
      </div>

      {/* Your rank callout */}
      {currentUserRank && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-green-400">{rankBadge(currentUserRank.rank)}</span>
            <div>
              <div className="font-bold text-white">Your ranking</div>
              <div className="text-sm text-gray-400">{currentUserRank.total_points} points</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm text-gray-500">
              {leaders.length > 0 && currentUserRank.rank <= leaders.length
                ? `Top ${Math.round((currentUserRank.rank / leaders.length) * 100)}%`
                : ''}
            </div>
            <button
              onClick={() => setSelectedLeader(currentUserRank)}
              className="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg transition-colors font-semibold"
            >
              My predictions →
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      {!leaders.length ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">🏆</div>
          <p>No predictions scored yet — check back after the first matches!</p>
        </div>
      ) : (
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Rank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Player</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Points</th>
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader, i) => {
                const isMe = leader.id === currentUserId
                return (
                  <tr
                    key={leader.id}
                    onClick={() => setSelectedLeader(leader)}
                    className={cn(
                      'border-b border-white/5 last:border-0 transition-colors cursor-pointer group',
                      isMe ? 'bg-green-500/5 hover:bg-green-500/10' : i % 2 === 0 ? 'bg-white/[0.02] hover:bg-white/[0.05]' : 'hover:bg-white/[0.03]',
                    )}
                  >
                    <td className="px-4 py-3 text-sm font-bold text-gray-400 w-16">
                      {rankBadge(leader.rank)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {(leader.display_name ?? leader.username ?? '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className={`text-sm font-semibold ${isMe ? 'text-green-400' : 'text-white'}`}>
                            {leader.display_name ?? leader.username}
                            {isMe && <span className="ml-1 text-xs text-green-500">(you)</span>}
                          </div>
                          <div className="text-xs text-gray-600">@{leader.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-black text-white">{leader.total_points}</span>
                      <span className="text-xs text-gray-500 ml-1">pts</span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Predictions panel */}
      {selectedLeader && (
        <UserPredictionsPanel
          leader={selectedLeader}
          currentUserId={currentUserId}
          onClose={() => setSelectedLeader(null)}
        />
      )}
    </div>
  )
}
