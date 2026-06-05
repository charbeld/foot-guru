import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hoursFromNow(h) {
  return new Date(Date.now() + h * 3_600_000).toISOString()
}
function minutesFromNow(m) {
  return new Date(Date.now() + m * 60_000).toISOString()
}
function hoursAgo(h) {
  return new Date(Date.now() - h * 3_600_000).toISOString()
}

// ─── Fetch teams ──────────────────────────────────────────────────────────────
const { data: teams } = await supabase.from('teams').select('id, code, elo_rating')
const byCode = Object.fromEntries(teams.map(t => [t.code, t]))

function team(code) {
  const t = byCode[code]
  if (!t) throw new Error(`Team not found: ${code}`)
  return t
}

// ─── Match definitions ────────────────────────────────────────────────────────
// status: 'finished' | 'live' | 'scheduled'
// home_score/away_score: only for finished/live
const MATCHES = [
  // ── GROUP STAGE — FINISHED (predictions scoreable) ────────────────────────
  {
    home: 'ESP', away: 'BRA', stage: 'group', group_name: 'A',
    kickoff: hoursAgo(48), venue: 'SoFi Stadium, Los Angeles',
    status: 'finished', home_score: 2, away_score: 1,
  },
  {
    home: 'FRA', away: 'ARG', stage: 'group', group_name: 'A',
    kickoff: hoursAgo(44), venue: 'MetLife Stadium, New York',
    status: 'finished', home_score: 1, away_score: 1,
  },
  {
    home: 'ENG', away: 'GER', stage: 'group', group_name: 'B',
    kickoff: hoursAgo(36), venue: 'AT&T Stadium, Dallas',
    status: 'finished', home_score: 3, away_score: 2,
  },
  {
    home: 'MAR', away: 'NED', stage: 'group', group_name: 'B',
    kickoff: hoursAgo(24), venue: 'Estadio Azteca, Mexico City',
    status: 'finished', home_score: 1, away_score: 0,
  },
  {
    home: 'JPN', away: 'NOR', stage: 'group', group_name: 'C',
    kickoff: hoursAgo(20), venue: 'Levi\'s Stadium, San Francisco',
    status: 'finished', home_score: 2, away_score: 2,
  },
  {
    home: 'COL', away: 'BEL', stage: 'group', group_name: 'C',
    kickoff: hoursAgo(12), venue: 'Arrowhead Stadium, Kansas City',
    status: 'finished', home_score: 0, away_score: 1,
  },

  // ── GROUP STAGE — LIVE (predictions locked) ───────────────────────────────
  {
    home: 'POR', away: 'URU', stage: 'group', group_name: 'D',
    kickoff: minutesFromNow(-30), venue: 'BC Place, Vancouver',
    status: 'live', home_score: 1, away_score: 0,
  },

  // ── GROUP STAGE — LOCKING VERY SOON (< 10 min) ───────────────────────────
  {
    home: 'USA', away: 'MEX', stage: 'group', group_name: 'D',
    kickoff: minutesFromNow(8), venue: 'Rose Bowl, Los Angeles',
    status: 'scheduled',
  },

  // ── GROUP STAGE — UPCOMING ────────────────────────────────────────────────
  {
    home: 'CRO', away: 'SEN', stage: 'group', group_name: 'E',
    kickoff: hoursFromNow(3), venue: 'Empower Field, Denver',
    status: 'scheduled',
  },
  {
    home: 'AUS', away: 'SUI', stage: 'group', group_name: 'E',
    kickoff: hoursFromNow(6), venue: 'NRG Stadium, Houston',
    status: 'scheduled',
  },
  {
    home: 'ECU', away: 'KOR', stage: 'group', group_name: 'F',
    kickoff: hoursFromNow(24), venue: 'Gillette Stadium, Boston',
    status: 'scheduled',
  },
  {
    home: 'TUR', away: 'EGY', stage: 'group', group_name: 'F',
    kickoff: hoursFromNow(27), venue: 'Hard Rock Stadium, Miami',
    status: 'scheduled',
  },
  {
    home: 'CAN', away: 'AUT', stage: 'group', group_name: 'G',
    kickoff: hoursFromNow(48), venue: 'BMO Field, Toronto',
    status: 'scheduled',
  },
  {
    home: 'SCO', away: 'ALG', stage: 'group', group_name: 'G',
    kickoff: hoursFromNow(51), venue: 'Stade Olympique, Montreal',
    status: 'scheduled',
  },

  // ── ROUND OF 16 (bigger stage multiplier × 1.5) ───────────────────────────
  {
    home: 'ESP', away: 'ENG', stage: 'round_of_16', group_name: null,
    kickoff: hoursFromNow(96), venue: 'SoFi Stadium, Los Angeles',
    status: 'scheduled',
  },
  {
    home: 'FRA', away: 'BRA', stage: 'round_of_16', group_name: null,
    kickoff: hoursFromNow(100), venue: 'MetLife Stadium, New York',
    status: 'scheduled',
  },

  // ── QUARTER-FINAL (× 2.0) ─────────────────────────────────────────────────
  {
    home: 'ARG', away: 'GER', stage: 'quarter_final', group_name: null,
    kickoff: hoursFromNow(168), venue: 'AT&T Stadium, Dallas',
    status: 'scheduled',
  },

  // ── SEMI-FINAL (× 2.5) ────────────────────────────────────────────────────
  {
    home: 'ESP', away: 'FRA', stage: 'semi_final', group_name: null,
    kickoff: hoursFromNow(240), venue: 'SoFi Stadium, Los Angeles',
    status: 'scheduled',
  },

  // ── FINAL (× 3.0) ─────────────────────────────────────────────────────────
  {
    home: 'ESP', away: 'ARG', stage: 'final', group_name: null,
    kickoff: hoursFromNow(336), venue: 'MetLife Stadium, New York',
    status: 'scheduled',
  },
]

// ─── Multipliers ──────────────────────────────────────────────────────────────
const STAGE_MULT = {
  group: 1.0, round_of_16: 1.5, quarter_final: 2.0,
  semi_final: 2.5, third_place: 2.0, final: 3.0,
}

// ─── Clear existing dummy matches ────────────────────────────────────────────
console.log('Clearing existing matches…')
await supabase.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')

// ─── Insert matches ───────────────────────────────────────────────────────────
console.log(`Inserting ${MATCHES.length} dummy matches…`)
const rows = MATCHES.map(m => {
  const home = team(m.home)
  const away = team(m.away)
  return {
    home_team_id:    home.id,
    away_team_id:    away.id,
    stage:           m.stage,
    group_name:      m.group_name ?? null,
    kickoff_at:      m.kickoff,
    venue:           m.venue,
    home_score:      m.home_score ?? null,
    away_score:      m.away_score ?? null,
    status:          m.status,
    home_elo:        home.elo_rating,
    away_elo:        away.elo_rating,
    stage_multiplier: STAGE_MULT[m.stage],
  }
})

const { data: inserted, error } = await supabase.from('matches').insert(rows).select()
if (error) { console.error('Insert error:', error); process.exit(1) }

console.log(`✅ ${inserted.length} matches inserted\n`)

// ─── Summary ──────────────────────────────────────────────────────────────────
const finished  = inserted.filter(m => m.status === 'finished')
const live      = inserted.filter(m => m.status === 'live')
const scheduled = inserted.filter(m => m.status === 'scheduled')

console.log(`  Finished  (scoreable):  ${finished.length}`)
console.log(`  Live      (locked):     ${live.length}`)
console.log(`  Scheduled (predict!):   ${scheduled.length}`)
console.log('\nShare the app link and start predicting: https://foot-guru.vercel.app')
