import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

export const revalidate = 300

const API = process.env.FOOTBALL_DATA_API_KEY!
const HEADERS = { 'X-Auth-Token': API }
const BEIRUT_TZ = 'Asia/Beirut'

// ─── Types ────────────────────────────────────────────────────────────────────
interface TeamRow {
  position: number
  team: { id: number; name: string; shortName: string; tla: string; crest: string }
  playedGames: number; won: number; draw: number; lost: number
  points: number; goalsFor: number; goalsAgainst: number; goalDifference: number
}

interface Scorer {
  player: { id: number; name: string; nationality: string }
  team: { name: string; shortName: string; tla: string; crest: string }
  playedMatches: number
  goals: number
  assists: number
  penalties: number
}

// ─── Data fetchers ────────────────────────────────────────────────────────────
async function fetchGroupStandings(): Promise<{ group: string; table: TeamRow[] }[]> {
  const [matchRes, standRes] = await Promise.all([
    fetch('https://api.football-data.org/v4/competitions/WC/matches?season=2026&stage=GROUP_STAGE',
      { headers: HEADERS, next: { revalidate: 300 } }),
    fetch('https://api.football-data.org/v4/competitions/WC/standings?season=2026',
      { headers: HEADERS, next: { revalidate: 300 } }),
  ])
  if (!matchRes.ok || !standRes.ok) return []

  const matchData = await matchRes.json()
  const standData = await standRes.json()

  // Build group → TLA mapping from match data
  const groupTeams: Record<string, Set<string>> = {}
  for (const m of matchData.matches ?? []) {
    const g = m.group?.replace('GROUP_', '')
    if (!g) continue
    if (!groupTeams[g]) groupTeams[g] = new Set()
    if (m.homeTeam?.tla) groupTeams[g].add(m.homeTeam.tla)
    if (m.awayTeam?.tla) groupTeams[g].add(m.awayTeam.tla)
  }
  const tlaToGroup: Record<string, string> = {}
  for (const [g, tlas] of Object.entries(groupTeams))
    for (const tla of tlas) tlaToGroup[tla] = g

  const allRows: TeamRow[] = standData.standings?.find((s: any) => s.type === 'TOTAL')?.table ?? []
  const grouped: Record<string, TeamRow[]> = {}
  for (const row of allRows) {
    const g = tlaToGroup[row.team.tla]
    if (!g) continue
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(row)
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, table]) => ({
      group,
      table: table
        .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
        .map((t, i) => ({ ...t, position: i + 1 })),
    }))
}

async function fetchScorers(): Promise<Scorer[]> {
  const res = await fetch(
    'https://api.football-data.org/v4/competitions/WC/scorers?season=2026&limit=20',
    { headers: HEADERS, next: { revalidate: 300 } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.scorers ?? []
}

// ─── Components ───────────────────────────────────────────────────────────────
function FormDot({ r }: { r: string }) {
  return (
    <span className={cn(
      'inline-block w-2 h-2 rounded-full',
      r === 'W' ? 'bg-green-500' : r === 'L' ? 'bg-red-500' : 'bg-gray-600'
    )} />
  )
}

function GroupCard({ group, table }: { group: string; table: TeamRow[] }) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
        <span className="text-sm font-black text-white">GROUP {group}</span>
        <Link href={`/matches?stage=group`}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          See matches →
        </Link>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-600 border-b border-white/5">
            <th className="text-left px-4 py-2 w-6">#</th>
            <th className="text-left px-2 py-2">Team</th>
            <th className="text-center px-1 py-2 w-7">P</th>
            <th className="text-center px-1 py-2 w-7">W</th>
            <th className="text-center px-1 py-2 w-7">D</th>
            <th className="text-center px-1 py-2 w-7">L</th>
            <th className="text-center px-1 py-2 w-10">GD</th>
            <th className="text-center px-2 py-2 w-8 text-white font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {table.map((row, idx) => (
            <tr key={row.team.id}
              className={cn('border-b border-white/5 last:border-0', idx < 2 && 'bg-green-500/[0.04]')}>
              <td className="px-4 py-2.5 text-gray-500 font-mono">{row.position}</td>
              <td className="px-2 py-2.5">
                <div className="flex items-center gap-2">
                  {row.team.crest && (
                    <Image src={row.team.crest} alt={row.team.tla} width={16} height={16}
                      className="object-contain shrink-0" unoptimized />
                  )}
                  <span className={cn('font-semibold', idx < 2 ? 'text-white' : 'text-gray-400')}>
                    {row.team.shortName}
                  </span>
                </div>
              </td>
              <td className="text-center px-1 py-2.5 text-gray-400">{row.playedGames}</td>
              <td className="text-center px-1 py-2.5 text-gray-400">{row.won}</td>
              <td className="text-center px-1 py-2.5 text-gray-400">{row.draw}</td>
              <td className="text-center px-1 py-2.5 text-gray-400">{row.lost}</td>
              <td className="text-center px-1 py-2.5 text-gray-400">
                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </td>
              <td className="text-center px-2 py-2.5 font-black text-white">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 border-t border-white/5 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-500/60 shrink-0" />
        <span className="text-xs text-gray-600">Top 2 advance guaranteed</span>
      </div>
    </div>
  )
}

function ScorerRow({ entry, rank, stat }: { entry: Scorer; rank: number; stat: 'goals' | 'assists' }) {
  const value = stat === 'goals' ? entry.goals : entry.assists
  if (!value) return null
  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="px-4 py-3 text-sm font-bold text-gray-500 w-10">{rank}</td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-2">
          {entry.team.crest && (
            <Image src={entry.team.crest} alt={entry.team.tla} width={18} height={18}
              className="object-contain shrink-0" unoptimized />
          )}
          <div>
            <div className="text-sm font-semibold text-white">{entry.player.name}</div>
            <div className="text-xs text-gray-500">{entry.team.shortName}</div>
          </div>
        </div>
      </td>
      <td className="px-2 py-3 text-center text-xs text-gray-500">{entry.playedMatches}</td>
      <td className="px-4 py-3 text-right">
        <span className="text-lg font-black text-white">{value}</span>
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function GroupsPage() {
  const [groups, scorers] = await Promise.all([
    fetchGroupStandings(),
    fetchScorers(),
  ])

  const assisters = [...scorers]
    .filter(s => (s.assists ?? 0) > 0)
    .sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))

  const topScorers = [...scorers]
    .filter(s => (s.goals ?? 0) > 0)
    .sort((a, b) => b.goals - a.goals)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Groups & Stats</h1>
          <p className="text-gray-500 text-sm mt-1">Updated every 5 min · 2026 FIFA World Cup</p>
        </div>
        <Link href="/bracket"
          className="text-sm font-semibold text-green-400 hover:text-green-300 transition-colors border border-green-500/30 px-3 py-1.5 rounded-lg hover:border-green-500/60">
          Bracket →
        </Link>
      </div>

      {/* Top stats tables */}
      {(topScorers.length > 0 || assisters.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top scorers */}
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03] flex items-center gap-2">
              <span className="text-lg">⚽</span>
              <span className="text-sm font-black text-white">Top Scorers</span>
            </div>
            {topScorers.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-6">No goals yet</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-gray-600 border-b border-white/5 text-xs">
                    <th className="text-left px-4 py-2 w-10">#</th>
                    <th className="text-left px-2 py-2">Player</th>
                    <th className="text-center px-2 py-2 w-10">MP</th>
                    <th className="text-right px-4 py-2">Goals</th>
                  </tr>
                </thead>
                <tbody>
                  {topScorers.slice(0, 10).map((s, i) => (
                    <ScorerRow key={s.player.id + 'g'} entry={s} rank={i + 1} stat="goals" />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top assisters */}
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03] flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-black text-white">Top Assisters</span>
            </div>
            {assisters.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-6">No assists yet</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-gray-600 border-b border-white/5 text-xs">
                    <th className="text-left px-4 py-2 w-10">#</th>
                    <th className="text-left px-2 py-2">Player</th>
                    <th className="text-center px-2 py-2 w-10">MP</th>
                    <th className="text-right px-4 py-2">Assists</th>
                  </tr>
                </thead>
                <tbody>
                  {assisters.slice(0, 10).map((s, i) => (
                    <ScorerRow key={s.player.id + 'a'} entry={s} rank={i + 1} stat="assists" />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Group standings grid — always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(({ group, table }) => (
          <GroupCard key={group} group={group} table={table} />
        ))}
      </div>
    </div>
  )
}
