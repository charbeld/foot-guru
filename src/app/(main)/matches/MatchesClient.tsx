'use client'

import { useState, useMemo } from 'react'
import { Match, Prediction, PredictionOutcome, MatchStage } from '@/types'
import { MatchCard } from '@/components/MatchCard'
import { STAGE_LABELS } from '@/lib/scoring'

const STAGE_ORDER: MatchStage[] = ['group', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final']

interface MatchesClientProps {
  matches: Match[]
  predictions: Prediction[]
}

export function MatchesClient({ matches: initialMatches, predictions: initialPredictions }: MatchesClientProps) {
  const [predictions, setPredictions] = useState<Prediction[]>(initialPredictions)
  const [activeStage, setActiveStage] = useState<MatchStage | 'all'>('group')

  const predictionMap = useMemo(() =>
    Object.fromEntries(predictions.map(p => [p.match_id, p])),
    [predictions]
  )

  const stages = useMemo(() => {
    const stagesInData = new Set(initialMatches.map(m => m.stage))
    return ['all' as const, ...STAGE_ORDER.filter(s => stagesInData.has(s))]
  }, [initialMatches])

  const filteredMatches = useMemo(() =>
    activeStage === 'all'
      ? initialMatches
      : initialMatches.filter(m => m.stage === activeStage),
    [initialMatches, activeStage]
  )

  const handlePredict = async (matchId: string, outcome: PredictionOutcome, home: number | null, away: number | null) => {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, predicted_outcome: outcome, predicted_home: home, predicted_away: away }),
    })
    if (!res.ok) throw new Error('Failed to save')
    const saved = await res.json()
    setPredictions(prev => {
      const filtered = prev.filter(p => p.match_id !== matchId)
      return [...filtered, saved]
    })
  }

  if (initialMatches.length === 0) {
    return (
      <div className="text-center py-24 text-gray-500">
        <div className="text-5xl mb-4">🏗️</div>
        <p className="text-lg font-semibold">Matches coming soon</p>
        <p className="text-sm mt-1">The schedule will be populated before the tournament.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Matches</h1>
        <p className="text-gray-500 text-sm mt-1">
          {predictions.length} prediction{predictions.length !== 1 ? 's' : ''} made
        </p>
      </div>

      {/* Stage filter tabs */}
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

      {/* Match grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMatches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            prediction={predictionMap[match.id]}
            onPredict={handlePredict}
          />
        ))}
      </div>
    </div>
  )
}
