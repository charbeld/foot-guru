import { cn } from '@/lib/utils'
import Image from 'next/image'

export const revalidate = 300 // refresh every 5 min

interface TeamStanding {
  position: number
  team: { id: number; name: string; shortName: string; tla: string; crest: string }
  playedGames: number
  won: number
  draw: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  form: string
}

interface GroupStanding {
  group: string | null
  table: TeamStanding[]
}

async function fetchStandings(): Promise<GroupStanding[]> {
  // Fetch group-stage matches to derive group membership, then overlay standings
  const [matchRes, standRes] = await Promise.all([
    fetch('https://api.football-data.org/v4/competitions/WC/matches?season=2026&stage=GROUP_STAGE', {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! },
      next: { revalidate: 300 },
    }),
    fetch('https://api.football-data.org/v4/competitions/WC/standings?season=2026', {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! },
      next: { revalidate: 300 },
    }),
  ])

  if (!matchRes.ok || !standRes.ok) return []

  const matchData = await matchRes.json()
  const standData = await standRes.json()

  // Build group → TLA set from matches
  const groupTeams: Record<string, Set<string>> = {}
  for (const m of matchData.matches ?? []) {
    const g = m.group?.replace('GROUP_', '')
    if (!g) continue
    if (!groupTeams[g]) groupTeams[g] = new Set()
    if (m.homeTeam?.tla) groupTeams[g].add(m.homeTeam.tla)
    if (m.awayTeam?.tla) groupTeams[g].add(m.awayTeam.tla)
  }

  // The TOTAL standings table has all 48 teams — split them into groups
  const totalStandings: TeamStanding[] = standData.standings?.find((s: any) => s.type === 'TOTAL')?.table ?? []

  // Map each team to its group
  const tlaToGroup: Record<string, string> = {}
  for (const [group, tlas] of Object.entries(groupTeams)) {
    for (const tla of tlas) tlaToGroup[tla] = group
  }

  // Group the standings
  const grouped: Record<string, TeamStanding[]> = {}
  for (const entry of totalStandings) {
    const group = tlaToGroup[entry.team.tla]
    if (!group) continue
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(entry)
  }

  // Sort each group by points desc, then GD, then GF
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, table]) => ({
      group,
      table: table.sort((a, b) =>
        b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
      ).map((t, i) => ({ ...t, position: i + 1 })),
    }))
}

function FormDot({ result }: { result: string }) {
  const color = result === 'W' ? 'bg-green-500' : result === 'L' ? 'bg-red-500' : 'bg-gray-500'
  return <span className={cn('inline-block w-2 h-2 rounded-full', color)} title={result} />
}

export default async function GroupsPage() {
  const groups = await fetchStandings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Group Standings</h1>
        <p className="text-gray-500 text-sm mt-1">Updated every 5 minutes · 2026 FIFA World Cup</p>
      </div>

      {groups.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">📊</div>
          <p>Standings will appear once matches begin on June 11.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(({ group, table }) => (
          <div key={group} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            {/* Group header */}
            <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03]">
              <span className="text-sm font-black text-white tracking-wide">GROUP {group}</span>
            </div>

            {/* Standings table */}
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
                {table.map((entry, idx) => {
                  const qualifies = idx < 2 // top 2 guaranteed to advance
                  return (
                    <tr key={entry.team.id}
                      className={cn(
                        'border-b border-white/5 last:border-0',
                        qualifies ? 'bg-green-500/5' : '',
                      )}>
                      <td className="px-4 py-2.5 text-gray-500 font-mono">{entry.position}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          {entry.team.crest && (
                            <Image src={entry.team.crest} alt={entry.team.tla}
                              width={18} height={18} className="object-contain shrink-0" unoptimized />
                          )}
                          <span className={cn('font-semibold', qualifies ? 'text-white' : 'text-gray-400')}>
                            {entry.team.shortName}
                          </span>
                        </div>
                      </td>
                      <td className="text-center px-1 py-2.5 text-gray-400">{entry.playedGames}</td>
                      <td className="text-center px-1 py-2.5 text-gray-400">{entry.won}</td>
                      <td className="text-center px-1 py-2.5 text-gray-400">{entry.draw}</td>
                      <td className="text-center px-1 py-2.5 text-gray-400">{entry.lost}</td>
                      <td className="text-center px-1 py-2.5 text-gray-400">
                        {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                      </td>
                      <td className="text-center px-2 py-2.5 font-black text-white">{entry.points}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Form guide */}
            <div className="px-4 py-2 border-t border-white/5 flex flex-col gap-1">
              {table.map(entry => (
                entry.form ? (
                  <div key={entry.team.id} className="flex items-center gap-2">
                    <span className="text-gray-600 w-16 truncate text-xs">{entry.team.shortName}</span>
                    <div className="flex gap-1">
                      {entry.form.split(',').filter(Boolean).slice(-5).map((r, i) => (
                        <FormDot key={i} result={r} />
                      ))}
                    </div>
                  </div>
                ) : null
              ))}
            </div>

            {/* Advance note */}
            <div className="px-4 py-2 border-t border-white/10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500/60 shrink-0" />
              <span className="text-xs text-gray-600">Top 2 advance · Best 3rd may also qualify</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
