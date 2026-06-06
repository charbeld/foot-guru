'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface Scorer {
  player: { id: number; name: string; nationality: string }
  team: { name: string; shortName: string; tla: string; crest: string }
  playedMatches: number
  goals: number
  assists: number
  penalties: number
  _rank: number
}

interface StatsClientProps {
  topScorers: Scorer[]
  topAssisters: Scorer[]
}

function StatTable({
  rows, valueKey, valueLabel, icon,
}: {
  rows: Scorer[]
  valueKey: 'goals' | 'assists'
  valueLabel: string
  icon: string
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-600">
        <div className="text-4xl mb-3">{icon}</div>
        <p className="text-sm">No data yet — tournament begins June 11</p>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="text-xs text-gray-600 border-b border-white/5">
          <th className="text-left px-5 py-3 w-10">#</th>
          <th className="text-left px-3 py-3">Player</th>
          <th className="text-center px-3 py-3 w-12">MP</th>
          {valueKey === 'goals' && (
            <th className="text-center px-3 py-3 w-12">Pen</th>
          )}
          <th className="text-right px-5 py-3 w-16">{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s, i) => {
          const value = valueKey === 'goals' ? s.goals : s.assists
          const isTop = i === 0
          return (
            <tr key={`${s.player.id}-${valueKey}`}
              className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
              <td className="px-5 py-3.5">
                <span className={`text-sm font-black ${isTop ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {isTop ? '🏆' : s._rank}
                </span>
              </td>
              <td className="px-3 py-3.5">
                <div className="flex items-center gap-3">
                  {s.team.crest && (
                    <Image src={s.team.crest} alt={s.team.tla} width={22} height={22}
                      className="object-contain shrink-0" unoptimized />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-white">{s.player.name}</div>
                    <div className="text-xs text-gray-500">{s.team.shortName} · {s.player.nationality}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3.5 text-center text-sm text-gray-500">{s.playedMatches}</td>
              {valueKey === 'goals' && (
                <td className="px-3 py-3.5 text-center text-xs text-gray-600">{s.penalties ?? 0}</td>
              )}
              <td className="px-5 py-3.5 text-right">
                <span className={`text-xl font-black ${isTop ? 'text-yellow-400' : 'text-white'}`}>
                  {value}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function StatsClient({ topScorers, topAssisters }: StatsClientProps) {
  const [tab, setTab] = useState<'scorers' | 'assisters'>('scorers')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Tournament Stats</h1>
        <p className="text-gray-500 text-sm mt-1">2026 FIFA World Cup · Updated every 5 min</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('scorers')}
          className={cn(
            'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
            tab === 'scorers'
              ? 'bg-white/15 text-white shadow'
              : 'text-gray-400 hover:text-white',
          )}
        >
          ⚽ Top Scorers
        </button>
        <button
          onClick={() => setTab('assisters')}
          className={cn(
            'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
            tab === 'assisters'
              ? 'bg-white/15 text-white shadow'
              : 'text-gray-400 hover:text-white',
          )}
        >
          🎯 Top Assisters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center gap-2">
          <span className="text-xl">{tab === 'scorers' ? '⚽' : '🎯'}</span>
          <span className="font-black text-white">
            {tab === 'scorers' ? 'Top Scorers' : 'Top Assisters'}
          </span>
          <span className="ml-auto text-xs text-gray-500">
            {tab === 'scorers' ? topScorers.length : topAssisters.length} players
          </span>
        </div>

        <StatTable
          rows={tab === 'scorers' ? topScorers : topAssisters}
          valueKey={tab === 'scorers' ? 'goals' : 'assists'}
          valueLabel={tab === 'scorers' ? 'Goals' : 'Assists'}
          icon={tab === 'scorers' ? '⚽' : '🎯'}
        />
      </div>
    </div>
  )
}
