import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { cn, formatKickoff } from '@/lib/utils'
import type { Match, MatchStage } from '@/types'

export const revalidate = 300

// ─── Quadrant color palette ───────────────────────────────────────────────────
const QUADRANT_COLORS = [
  {
    border:  'border-l-blue-500',
    bg:      'bg-blue-500/8',
    header:  'bg-blue-500/10 border border-blue-500/25',
    text:    'text-blue-400',
    dot:     'bg-blue-500',
    arrow:   'text-blue-500/60',
    label:   'Q1',
    sfLabel: 'Q1 → Semi-Final 1',
  },
  {
    border:  'border-l-purple-500',
    bg:      'bg-purple-500/8',
    header:  'bg-purple-500/10 border border-purple-500/25',
    text:    'text-purple-400',
    dot:     'bg-purple-500',
    arrow:   'text-purple-500/60',
    label:   'Q2',
    sfLabel: 'Q2 → Semi-Final 1',
  },
  {
    border:  'border-l-orange-500',
    bg:      'bg-orange-500/8',
    header:  'bg-orange-500/10 border border-orange-500/25',
    text:    'text-orange-400',
    dot:     'bg-orange-500',
    arrow:   'text-orange-500/60',
    label:   'Q3',
    sfLabel: 'Q3 → Semi-Final 2',
  },
  {
    border:  'border-l-emerald-500',
    bg:      'bg-emerald-500/8',
    header:  'bg-emerald-500/10 border border-emerald-500/25',
    text:    'text-emerald-400',
    dot:     'bg-emerald-500',
    arrow:   'text-emerald-500/60',
    label:   'Q4',
    sfLabel: 'Q4 → Semi-Final 2',
  },
]

// ─── external_id → quadrant index (0-3), -1 = SF/3rd/Final ──────────────────
const MATCH_QUADRANT: Record<string, number> = {
  // Q1 (Blue): R32 → R16 → QF
  '537417': 0, '537415': 0, '537423': 0, '537424': 0,
  '537376': 0, '537375': 0,
  '537383': 0,
  // Q2 (Purple): R32 → R16 → QF
  '537418': 1, '537416': 1, '537425': 1, '537426': 1,
  '537377': 1, '537378': 1,
  '537385': 1,
  // Q3 (Orange): R32 → R16 → QF
  '537420': 2, '537419': 2, '537422': 2, '537421': 2,
  '537379': 2, '537380': 2,
  '537384': 2,
  // Q4 (Green): R32 → R16 → QF
  '537428': 3, '537430': 3, '537429': 3, '537427': 3,
  '537381': 3, '537382': 3,
  '537386': 3,
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex flex-wrap gap-3 items-center text-xs">
      {QUADRANT_COLORS.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', c.dot)} />
          <span className={cn('font-semibold', c.text)}>{c.label}</span>
          <span className="text-gray-600">— {c.sfLabel.split(' → ')[1]}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
        <span className="font-semibold text-yellow-400">SF · 3rd · Final</span>
      </div>
    </div>
  )
}

// ─── Compact match tile for bracket ──────────────────────────────────────────
function BracketTile({ match, qIdx }: { match: Match; qIdx: number }) {
  const color   = qIdx >= 0 ? QUADRANT_COLORS[qIdx] : null
  const isTBD   = !match.home_team_id || !match.away_team_id
  const isDone  = match.status === 'finished'
  const homeWon = isDone && match.home_score! > match.away_score!
  const awayWon = isDone && match.away_score! > match.home_score!

  function Side({ side }: { side: 'home' | 'away' }) {
    const team  = side === 'home' ? match.home_team  : match.away_team
    const ph    = side === 'home' ? match.placeholder_home : match.placeholder_away
    const score = isDone ? (side === 'home' ? match.home_score : match.away_score) : null
    const won   = side === 'home' ? homeWon : awayWon

    return (
      <div className={cn('flex items-center gap-2 px-2.5 py-2', won && 'bg-white/5')}>
        {team?.flag_url ? (
          <Image src={team.flag_url} alt={team.name} width={20} height={13}
            className="rounded object-cover shrink-0" unoptimized />
        ) : (
          <div className="w-5 h-3.5 rounded bg-white/10 shrink-0" />
        )}
        <span className={cn(
          'flex-1 truncate text-xs font-semibold',
          isTBD ? 'text-gray-500 italic' : won ? 'text-white' : 'text-gray-400',
        )}>
          {team?.name ?? ph ?? 'TBD'}
        </span>
        {isDone && (
          <span className={cn('text-xs font-black tabular-nums shrink-0 ml-1',
            won ? 'text-white' : 'text-gray-500')}>
            {score}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-lg border border-white/10 overflow-hidden border-l-4 transition-all',
      color ? `${color.border} ${color.bg}` : 'border-l-yellow-500 bg-yellow-500/5',
      isTBD && 'opacity-55',
    )}>
      <Side side="home" />
      <div className="border-t border-white/10" />
      <Side side="away" />
      <div className="px-2.5 py-1 border-t border-white/5">
        <span className="text-[10px] text-gray-700 leading-none">{formatKickoff(match.kickoff_at)}</span>
      </div>
    </div>
  )
}

// ─── Stage label within a quadrant column ────────────────────────────────────
function StageLabel({ label, color }: { label: string; color: typeof QUADRANT_COLORS[0] }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <div className={cn('h-px flex-1', `bg-${color.dot.replace('bg-', '')}/20`)} />
      <span className={cn('text-[10px] font-bold uppercase tracking-widest', color.text)}>{label}</span>
      <div className={cn('h-px flex-1', `bg-${color.dot.replace('bg-', '')}/20`)} />
    </div>
  )
}

// ─── Arrow connector between rounds ──────────────────────────────────────────
function RoundConnector({ color }: { color: typeof QUADRANT_COLORS[0] }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className={cn('w-px h-3', `bg-${color.dot.replace('bg-', '')}/30`)} />
      <span className={cn('text-xs leading-none', color.arrow)}>▼</span>
      <div className={cn('w-px h-3', `bg-${color.dot.replace('bg-', '')}/30`)} />
    </div>
  )
}

// ─── Centered stage divider (for SF / Final) ──────────────────────────────────
function StageDivider({ label, sublabel, gold }: { label: string; sublabel?: string; gold?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="flex items-center gap-3 w-full max-w-2xl mx-auto">
        <div className="h-px flex-1 bg-white/10" />
        <div className="text-center">
          <div className={cn('text-sm font-black', gold ? 'text-yellow-400' : 'text-white')}>{label}</div>
          {sublabel && <div className="text-[10px] text-gray-600 mt-0.5">{sublabel}</div>}
        </div>
        <div className="h-px flex-1 bg-white/10" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function BracketPage() {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
    .in('stage', ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'])
    .order('kickoff_at', { ascending: true })

  const all = matches ?? []

  // ── Bucket matches by quadrant and stage ──────────────────────────────────
  type QData = { r32: Match[]; r16: Match[]; qf: Match[] }
  const qBuckets: QData[] = [
    { r32: [], r16: [], qf: [] },
    { r32: [], r16: [], qf: [] },
    { r32: [], r16: [], qf: [] },
    { r32: [], r16: [], qf: [] },
  ]
  const sfMatches:    Match[] = []
  const thirdMatches: Match[] = []
  const finalMatches: Match[] = []

  for (const m of all) {
    const qIdx = m.external_id ? (MATCH_QUADRANT[m.external_id] ?? -1) : -1
    if (m.stage === 'semi_final')   { sfMatches.push(m);    continue }
    if (m.stage === 'third_place')  { thirdMatches.push(m); continue }
    if (m.stage === 'final')        { finalMatches.push(m); continue }
    if (qIdx < 0) continue
    if (m.stage === 'round_of_32')  qBuckets[qIdx].r32.push(m)
    if (m.stage === 'round_of_16')  qBuckets[qIdx].r16.push(m)
    if (m.stage === 'quarter_final') qBuckets[qIdx].qf.push(m)
  }

  const hasAnyKnockout = all.length > 0

  return (
    <div className="space-y-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-white">Knockout Bracket</h1>
        <p className="text-gray-500 text-sm mt-1">
          Teams advance automatically as each game is decided · Bracket updates live
        </p>
      </div>

      <Legend />

      {!hasAnyKnockout ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-5xl mb-3">🏆</div>
          <p className="text-sm">Knockout bracket will appear once the group stage concludes.</p>
        </div>
      ) : (
        <>
          {/* ── Round-of-32 header ──────────────────────────────────────── */}
          {qBuckets.some(q => q.r32.length > 0) && (
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
                Round of 32
              </span>
            </div>
          )}

          {/* ── 4 quadrant columns ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {QUADRANT_COLORS.map((color, qIdx) => {
              const q = qBuckets[qIdx]
              const hasContent = q.r32.length > 0 || q.r16.length > 0 || q.qf.length > 0
              if (!hasContent) return (
                <div key={qIdx} className={cn('rounded-xl border p-4 opacity-40', color.header)}>
                  <div className={cn('text-xs font-bold uppercase tracking-widest mb-3', color.text)}>
                    {color.label} — {color.sfLabel.split(' → ')[1]}
                  </div>
                  <p className="text-xs text-gray-600 text-center py-4">Bracket TBD</p>
                </div>
              )

              return (
                <div key={qIdx} className={cn('rounded-xl border p-4 space-y-3', color.header)}>
                  {/* Quadrant header */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', color.dot)} />
                    <span className={cn('text-xs font-black uppercase tracking-wider', color.text)}>
                      {color.label}
                    </span>
                    <span className="text-[10px] text-gray-600 ml-auto">{color.sfLabel.split(' → ')[1]}</span>
                  </div>

                  {/* Round of 32 */}
                  {q.r32.length > 0 && (
                    <div>
                      <StageLabel label="Round of 32" color={color} />
                      <div className="space-y-1.5">
                        {q.r32.map(m => <BracketTile key={m.id} match={m} qIdx={qIdx} />)}
                      </div>
                    </div>
                  )}

                  {/* R32 → R16 connector */}
                  {q.r32.length > 0 && q.r16.length > 0 && (
                    <RoundConnector color={color} />
                  )}

                  {/* Round of 16 */}
                  {q.r16.length > 0 && (
                    <div>
                      <StageLabel label="Round of 16" color={color} />
                      <div className="space-y-1.5">
                        {q.r16.map(m => <BracketTile key={m.id} match={m} qIdx={qIdx} />)}
                      </div>
                    </div>
                  )}

                  {/* R16 → QF connector */}
                  {q.r16.length > 0 && q.qf.length > 0 && (
                    <RoundConnector color={color} />
                  )}

                  {/* Quarter-Final */}
                  {q.qf.length > 0 && (
                    <div>
                      <StageLabel label="Quarter-Final" color={color} />
                      <div className="space-y-1.5">
                        {q.qf.map(m => <BracketTile key={m.id} match={m} qIdx={qIdx} />)}
                      </div>
                    </div>
                  )}

                  {/* QF → SF connector */}
                  {q.qf.length > 0 && sfMatches.length > 0 && (
                    <RoundConnector color={color} />
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Semi-Finals ─────────────────────────────────────────────── */}
          {sfMatches.length > 0 && (
            <div className="space-y-3">
              <StageDivider label="Semi-Finals" sublabel="Q1+Q2 winner · Q3+Q4 winner" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {sfMatches.map(m => (
                  <BracketTile key={m.id} match={m} qIdx={-1} />
                ))}
              </div>
            </div>
          )}

          {/* ── Third Place ──────────────────────────────────────────────── */}
          {thirdMatches.length > 0 && (
            <div className="space-y-3">
              <StageDivider label="Third Place" sublabel="Semi-final losers" />
              <div className="max-w-sm mx-auto">
                {thirdMatches.map(m => (
                  <BracketTile key={m.id} match={m} qIdx={-1} />
                ))}
              </div>
            </div>
          )}

          {/* ── Final ───────────────────────────────────────────────────── */}
          {finalMatches.length > 0 && (
            <div className="space-y-3">
              <StageDivider label="🏆 The Final" sublabel="World Cup Champion" gold />
              <div className="max-w-sm mx-auto">
                {finalMatches.map(m => (
                  <BracketTile key={m.id} match={m} qIdx={-1} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
