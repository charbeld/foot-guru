/**
 * Seed 2026 World Cup group stage matches from football-data.org
 * Run after the schedule is published: npx tsx scripts/seed-matches.ts
 *
 * football-data.org competition code for 2026 WC: WC (or check their docs)
 */

import { createClient } from '@supabase/supabase-js'
import { STAGE_MULTIPLIERS } from '../src/lib/scoring'
import type { MatchStage } from '../src/types'

const STAGE_MAP: Record<string, MatchStage> = {
  'GROUP_STAGE':      'group',
  'ROUND_OF_16':      'round_of_16',
  'QUARTER_FINALS':   'quarter_final',
  'SEMI_FINALS':      'semi_final',
  'THIRD_PLACE':      'third_place',
  'FINAL':            'final',
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const apiKey      = process.env.FOOTBALL_DATA_API_KEY

  if (!supabaseUrl || !serviceKey || !apiKey) {
    console.error('Missing environment variables. Copy .env.local.example to .env.local and fill in.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Fetch all World Cup 2026 matches
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': apiKey },
  })

  if (!res.ok) {
    console.error(`football-data.org error: HTTP ${res.status}`)
    const text = await res.text()
    console.error(text)
    process.exit(1)
  }

  const data = await res.json()
  const apiMatches = data.matches ?? []

  console.log(`Found ${apiMatches.length} matches from API`)

  // Load our teams table to map names → IDs
  const { data: teams } = await supabase.from('teams').select('id, name, code, elo_rating')
  if (!teams?.length) {
    console.error('No teams in DB — run scrape-elo.ts first!')
    process.exit(1)
  }

  const teamByName = Object.fromEntries(teams.map(t => [t.name.toLowerCase(), t]))
  const teamByCode = Object.fromEntries(teams.map(t => [t.code, t]))

  const rows = []

  for (const m of apiMatches) {
    const apiStage: string = m.stage ?? 'GROUP_STAGE'
    const stage: MatchStage = STAGE_MAP[apiStage] ?? 'group'

    // Resolve teams by name or tla (3-letter code)
    const homeTeam =
      teamByCode[m.homeTeam?.tla] ??
      teamByName[(m.homeTeam?.name ?? '').toLowerCase()]
    const awayTeam =
      teamByCode[m.awayTeam?.tla] ??
      teamByName[(m.awayTeam?.name ?? '').toLowerCase()]

    if (!homeTeam || !awayTeam) {
      console.warn(`  ⚠ Skipping match ${m.id}: unknown team(s)`,
        m.homeTeam?.name, 'vs', m.awayTeam?.name)
      continue
    }

    rows.push({
      home_team_id:     homeTeam.id,
      away_team_id:     awayTeam.id,
      stage,
      group_name:       m.group?.replace('GROUP_', '') ?? null,
      kickoff_at:       m.utcDate,
      venue:            m.venue ?? null,
      home_elo:         homeTeam.elo_rating,
      away_elo:         awayTeam.elo_rating,
      stage_multiplier: STAGE_MULTIPLIERS[stage],
      external_id:      String(m.id),
      status:           'scheduled',
    })
  }

  console.log(`Upserting ${rows.length} matches…`)

  const { error } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'external_id' })

  if (error) {
    console.error('Supabase error:', error)
    process.exit(1)
  }

  console.log('✅ Matches seeded successfully!')
}

main().catch(err => { console.error(err); process.exit(1) })
