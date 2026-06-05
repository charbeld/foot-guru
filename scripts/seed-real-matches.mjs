import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const FOOTBALL_API_KEY = process.env.FOOTBALL_DATA_API_KEY
const BEIRUT_TZ = 'Asia/Beirut'

// API TLA → our DB code mapping (only where different)
const TLA_MAP = {
  URY: 'URU',  // Uruguay
  CUR: 'CUW',  // Curaçao (FIFA uses CUR, we stored CUW)
}

// API stage → our match_stage enum
const STAGE_MAP = {
  GROUP_STAGE:   'group',
  LAST_32:       'round_of_32',
  LAST_16:       'round_of_16',
  QUARTER_FINALS:'quarter_final',
  SEMI_FINALS:   'semi_final',
  THIRD_PLACE:   'third_place',
  FINAL:         'final',
}

const STAGE_MULT = {
  group:        1.0,
  round_of_32:  1.25,
  round_of_16:  1.5,
  quarter_final:2.0,
  semi_final:   2.5,
  third_place:  2.0,
  final:        3.0,
}

// Fetch real schedule from football-data.org
console.log('Fetching 2026 WC schedule from football-data.org…')
const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches?season=2026', {
  headers: { 'X-Auth-Token': FOOTBALL_API_KEY }
})
const data = await res.json()
const apiMatches = data.matches ?? []
console.log(`Got ${apiMatches.length} matches from API`)

// Load our teams
const { data: teams } = await supabase.from('teams').select('id, code, elo_rating')
const teamByCode = Object.fromEntries(teams.map(t => [t.code, t]))

// Build rows
const rows = []
const skipped = []

for (const m of apiMatches) {
  const apiStage = m.stage
  const stage = STAGE_MAP[apiStage]
  if (!stage) { skipped.push(`Unknown stage: ${apiStage}`); continue }

  const homeTla = TLA_MAP[m.homeTeam.tla] ?? m.homeTeam.tla
  const awayTla = TLA_MAP[m.awayTeam.tla] ?? m.awayTeam.tla

  const homeTeam = teamByCode[homeTla]
  const awayTeam = teamByCode[awayTla]

  if (!homeTeam || !awayTeam) {
    // TBD matches in knockout stage — skip for now, add when teams are known
    if (m.homeTeam.tla && m.awayTeam.tla) {
      skipped.push(`Missing team: ${homeTla} vs ${awayTla}`)
    }
    continue
  }

  // Map API status to our status
  const status =
    m.status === 'FINISHED' ? 'finished' :
    m.status === 'IN_PLAY' || m.status === 'PAUSED' ? 'live' :
    'scheduled'

  // Extract group letter from matchday info
  const groupName = m.group?.replace('GROUP_', '') ?? null

  rows.push({
    home_team_id:    homeTeam.id,
    away_team_id:    awayTeam.id,
    stage,
    group_name:      groupName,
    kickoff_at:      m.utcDate,            // stored as UTC
    venue:           m.venue ?? null,
    home_score:      m.score?.fullTime?.home ?? null,
    away_score:      m.score?.fullTime?.away ?? null,
    status,
    home_elo:        homeTeam.elo_rating,
    away_elo:        awayTeam.elo_rating,
    stage_multiplier: STAGE_MULT[stage],
    external_id:     String(m.id),
  })
}

console.log(`Building ${rows.length} rows (skipped ${skipped.length})`)
if (skipped.length) console.log('Skipped:', skipped.slice(0, 5))

// Upsert
const { error } = await supabase
  .from('matches')
  .upsert(rows, { onConflict: 'external_id' })

if (error) { console.error('Error:', error); process.exit(1) }

console.log(`\n✅ ${rows.length} real 2026 WC matches seeded!`)

// Show first 5 in Beirut time
const fmt = (iso) => new Date(iso).toLocaleString('en-GB', {
  timeZone: BEIRUT_TZ, weekday:'short', day:'numeric', month:'short',
  hour:'2-digit', minute:'2-digit'
})
console.log('\nFirst 5 matches (Beirut time):')
rows.slice(0, 5).forEach(r => {
  const h = teams.find(t=>t.id===r.home_team_id)
  const a = teams.find(t=>t.id===r.away_team_id)
  // get code from id
  const hCode = Object.entries(teamByCode).find(([,t])=>t.id===r.home_team_id)?.[0]
  const aCode = Object.entries(teamByCode).find(([,t])=>t.id===r.away_team_id)?.[0]
  console.log(`  ${fmt(r.kickoff_at)} · ${hCode} vs ${aCode} [${r.stage}]`)
})
