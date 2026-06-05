import { StatsClient } from './StatsClient'

export const revalidate = 300

interface Scorer {
  player: { id: number; name: string; nationality: string }
  team: { name: string; shortName: string; tla: string; crest: string }
  playedMatches: number
  goals: number
  assists: number
  penalties: number
}

async function fetchScorers(): Promise<Scorer[]> {
  const res = await fetch(
    'https://api.football-data.org/v4/competitions/WC/scorers?season=2026&limit=30',
    {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! },
      next: { revalidate: 300 },
    }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.scorers ?? []
}

export default async function StatsPage() {
  const scorers = await fetchScorers()

  const topScorers = [...scorers]
    .sort((a, b) => b.goals - a.goals || (b.assists ?? 0) - (a.assists ?? 0))
    .map((s, i) => ({ ...s, _rank: i + 1 }))

  const topAssisters = [...scorers]
    .sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0) || b.goals - a.goals)
    .map((s, i) => ({ ...s, _rank: i + 1 }))

  return <StatsClient topScorers={topScorers} topAssisters={topAssisters} />
}
