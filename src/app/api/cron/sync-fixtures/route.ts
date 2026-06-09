import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import type { MatchStage } from '@/types'

const STAGE_MAP: Record<string, MatchStage> = {
  GROUP_STAGE:    'group',
  LAST_32:        'round_of_32',
  LAST_16:        'round_of_16',
  QUARTER_FINALS: 'quarter_final',
  SEMI_FINALS:    'semi_final',
  THIRD_PLACE:    'third_place',
  FINAL:          'final',
}

const STAGE_MULT: Record<MatchStage, number> = {
  group:         1.0,
  round_of_32:   1.25,
  round_of_16:   1.5,
  quarter_final: 2.0,
  semi_final:    2.5,
  third_place:   2.0,
  final:         3.0,
}

// TLA overrides where API code differs from our DB code
const TLA_MAP: Record<string, string> = {
  URY: 'URU',
  CUR: 'CUW',
}

// Called by pg_cron daily — keeps all fixtures up to date as teams qualify
export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const apiKey   = process.env.FOOTBALL_DATA_API_KEY!

  // Fetch full WC schedule
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches?season=2026', {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 0 },
  })
  if (!res.ok) return NextResponse.json({ error: `API ${res.status}` }, { status: 502 })

  const data = await res.json()
  const apiMatches: any[] = data.matches ?? []

  // Load teams lookup
  const { data: teams } = await supabase.from('teams').select('id, code, elo_rating')
  const byCode = Object.fromEntries((teams ?? []).map((t: any) => [t.code, t]))

  let added = 0, updated = 0, skipped = 0

  for (const m of apiMatches) {
    const stage = STAGE_MAP[m.stage]
    if (!stage) { skipped++; continue }

    const homeTla  = TLA_MAP[m.homeTeam?.tla] ?? m.homeTeam?.tla
    const awayTla  = TLA_MAP[m.awayTeam?.tla] ?? m.awayTeam?.tla
    const homeTeam = byCode[homeTla]
    const awayTeam = byCode[awayTla]

    // Skip if either team is still TBD
    if (!homeTeam || !awayTeam) { skipped++; continue }

    const status =
      m.status === 'FINISHED'                      ? 'finished' :
      m.status === 'IN_PLAY' || m.status === 'PAUSED' ? 'live'  : 'scheduled'

    const row = {
      home_team_id:     homeTeam.id,
      away_team_id:     awayTeam.id,
      stage,
      group_name:       m.group?.replace('GROUP_', '') ?? null,
      kickoff_at:       m.utcDate,
      venue:            m.venue ?? null,
      home_score:       m.score?.fullTime?.home ?? null,
      away_score:       m.score?.fullTime?.away ?? null,
      status,
      home_elo:         homeTeam.elo_rating,
      away_elo:         awayTeam.elo_rating,
      stage_multiplier: STAGE_MULT[stage],
      external_id:      String(m.id),
    }

    // Check if match already exists
    const { data: existing } = await supabase
      .from('matches')
      .select('id, status, home_score')
      .eq('external_id', String(m.id))
      .single()

    if (!existing) {
      // New match — teams just determined, insert it
      await supabase.from('matches').insert(row)
      added++
    } else {
      // Update status / score if changed
      const needsUpdate =
        existing.status !== status ||
        (status === 'finished' && existing.home_score === null)

      if (needsUpdate) {
        await supabase
          .from('matches')
          .update({ status, home_score: row.home_score, away_score: row.away_score })
          .eq('id', existing.id)
        updated++
      }
    }
  }

  return NextResponse.json({ added, updated, skipped })
}
