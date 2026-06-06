'use client'

import { useState, useMemo } from 'react'
import { Match, Prediction, PredictionOutcome, MatchStage } from '@/types'
import { MatchCard } from '@/components/MatchCard'
import { STAGE_LABELS } from '@/lib/scoring'

const BEIRUT_TZ = 'Asia/Beirut'
const STAGE_ORDER: MatchStage[] = ['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final']

// Format a UTC ISO string as a Beirut-local date key: "2026-06-11"
function toBeirutDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: BEIRUT_TZ }) // "YYYY-MM-DD"
}

// Format a date key for display: "Thu, 11 Jun"
function formatDayLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00') // noon to avoid DST edge
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function todayBeirutKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: BEIRUT_TZ })
}

interface MatchesClientProps {
  matches: Match[]
  predictions: Prediction[]
}

export function MatchesClient({ matches: initialMatches, predictions: initialPredictions }: MatchesClientProps) {
  const [predictions, setPredictions] = useState<Prediction[]>(initialPredictions)
  const [activeStage, setActiveStage] = useState<MatchStage | 'all'>('all')

  const today = todayBeirutKey()

  // Start with today expanded; all others collapsed
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({ [today]: true }))

  const predictionMap = useMemo(
    () => Object.fromEntries(predictions.map(p => [p.match_id, p])),
    [predictions]
  )

  const stages = useMemo(() => {
    const inData = new Set(initialMatches.map(m => m.stage))
    return ['all' as const, ...STAGE_ORDER.filter(s => inData.has(s))]
  }, [initialMatches])

  const filtered = useMemo(() =>
    activeStage === 'all'
      ? initialMatches
      : initialMatches.filter(m => m.stage === activeStage),
    [initialMatches, activeStage]
  )

  // Group by Beirut date, preserving chronological order
  const dayGroups = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of filtered) {
      const key = toBeirutDateKey(m.kickoff_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const handlePredict = async (matchId: string, outcome: PredictionOutcome, home: number | null, away: number | null) => {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, predicted_outcome: outcome, predicted_home: home, predicted_away: away }),
    })
    if (!res.ok) throw new Error('Failed to save')
    const saved = await res.json()
    setPredictions(prev => [...prev.filter(p => p.match_id !== matchId), saved])
  }

  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  const expandAll   = () => setExpanded(Object.fromEntries(dayGroups.map(([k]) => [k, true])))
  const collapseAll = () => setExpanded({})

  const predictedCount = predictions.length
  const totalScheduled = initialMatches.filter(m => m.status === 'scheduled' && m.home_team_id).length

  if (initialMatches.length === 0) {
    return (
      <div className="text-center py-24 text-gray-500">
        <div className="text-5xl mb-4">🏗️</div>
        <p className="text-lg font-semibold">No matches yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Matches</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {predictedCount} prediction{predictedCount !== 1 ? 's' : ''} made · {totalScheduled} upcoming
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={expandAll}   className="text-gray-500 hover:text-white transition-colors">Expand all</button>
          <span className="text-gray-700">·</span>
          <button onClick={collapseAll} className="text-gray-500 hover:text-white transition-colors">Collapse all</button>
        </div>
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 flex-wrap">
        {stages.map(stage => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeStage === stage
                ? 'bg-green-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            {stage === 'all' ? 'All Stages' : STAGE_LABELS[stage]}
          </button>
        ))}
      </div>

      {/* Day sections */}
      <div className="space-y-3">
        {dayGroups.map(([dateKey, dayMatches]) => {
          const isToday   = dateKey === today
          const isOpen    = expanded[dateKey] ?? false
          const predicted = dayMatches.filter(m => predictionMap[m.id]).length
          const total     = dayMatches.filter(m => m.home_team_id).length // excludes TBD
          const now       = new Date()
          const hasMissed = dayMatches.some(m =>
            m.home_team_id &&
            !predictionMap[m.id] &&
            new Date(m.kickoff_at) > now
          )

          return (
            <div key={dateKey} className="rounded-2xl border border-white/10 overflow-hidden">
              {/* Day header — clickable */}
              <button
                onClick={() => toggle(dateKey)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.04] hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isToday && (
                    <span className="text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">TODAY</span>
                  )}
                  <span className={`font-bold ${isToday ? 'text-green-400' : 'text-white'}`}>
                    {formatDayLabel(dateKey)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {dayMatches.length} match{dayMatches.length !== 1 ? 'es' : ''}
                    {total > 0 && predicted > 0 && ` · ${predicted}/${total} predicted`}
                  </span>
                  {hasMissed && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  )}
                </div>
                <span className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>

              {/* Match cards — collapsible */}
              {isOpen && (
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 border-t border-white/10">
                  {dayMatches.map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={predictionMap[match.id]}
                      onPredict={handlePredict}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
