/**
 * Inserts all TBD knockout stage matches with bracket placeholder labels.
 * Based on the official 2026 WC bracket (FIFA draw, December 2024).
 * Teams auto-update via sync-fixtures once qualified.
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const STAGE_MULT = {
  round_of_32: 1.25, round_of_16: 1.5,
  quarter_final: 2.0, semi_final: 2.5, third_place: 2.0, final: 3.0,
}

// ─── Official 2026 WC bracket ─────────────────────────────────────────────────
// R32: match IDs from football-data.org ordered by utcDate, mapped to FIFA bracket positions
// Wikipedia match numbers 73–88 (R32), 89–96 (R16), 97–100 (QF), 101–102 (SF), 103 (3rd), 104 (Final)
const BRACKET = [
  // ── Round of 32 ─────────────────────────────────────────────────────────────
  { external_id: '537417', stage: 'round_of_32', kickoff: '2026-06-28T20:00:00Z', match_num: 73,
    ph: '2nd Group A', pa: '2nd Group B' },
  { external_id: '537423', stage: 'round_of_32', kickoff: '2026-06-29T17:00:00Z', match_num: 74,
    ph: '1st Group E', pa: 'Best 3rd (A/B/C/D/F)' },
  { external_id: '537415', stage: 'round_of_32', kickoff: '2026-06-29T20:00:00Z', match_num: 75,
    ph: '1st Group F', pa: '2nd Group C' },
  { external_id: '537418', stage: 'round_of_32', kickoff: '2026-06-30T17:00:00Z', match_num: 76,
    ph: '1st Group C', pa: '2nd Group F' },
  { external_id: '537424', stage: 'round_of_32', kickoff: '2026-06-30T20:00:00Z', match_num: 77,
    ph: '1st Group I', pa: 'Best 3rd (C/D/F/G/H)' },
  { external_id: '537416', stage: 'round_of_32', kickoff: '2026-06-30T23:00:00Z', match_num: 78,
    ph: '2nd Group E', pa: '2nd Group I' },
  { external_id: '537425', stage: 'round_of_32', kickoff: '2026-07-01T17:00:00Z', match_num: 79,
    ph: '1st Group A', pa: 'Best 3rd (C/E/F/H/I)' },
  { external_id: '537426', stage: 'round_of_32', kickoff: '2026-07-01T20:00:00Z', match_num: 80,
    ph: '1st Group L', pa: 'Best 3rd (E/H/I/J/K)' },
  { external_id: '537422', stage: 'round_of_32', kickoff: '2026-07-01T23:00:00Z', match_num: 81,
    ph: '1st Group D', pa: 'Best 3rd (B/E/F/I/J)' },
  { external_id: '537421', stage: 'round_of_32', kickoff: '2026-07-02T17:00:00Z', match_num: 82,
    ph: '1st Group G', pa: 'Best 3rd (A/E/H/I/J)' },
  { external_id: '537420', stage: 'round_of_32', kickoff: '2026-07-02T20:00:00Z', match_num: 83,
    ph: '2nd Group K', pa: '2nd Group L' },
  { external_id: '537419', stage: 'round_of_32', kickoff: '2026-07-02T23:00:00Z', match_num: 84,
    ph: '1st Group H', pa: '2nd Group J' },
  { external_id: '537429', stage: 'round_of_32', kickoff: '2026-07-03T17:00:00Z', match_num: 85,
    ph: '1st Group B', pa: 'Best 3rd (E/F/G/I/J)' },
  { external_id: '537428', stage: 'round_of_32', kickoff: '2026-07-03T20:00:00Z', match_num: 86,
    ph: '1st Group J', pa: '2nd Group H' },
  { external_id: '537427', stage: 'round_of_32', kickoff: '2026-07-03T23:00:00Z', match_num: 87,
    ph: '1st Group K', pa: 'Best 3rd (D/E/I/J/L)' },
  { external_id: '537430', stage: 'round_of_32', kickoff: '2026-07-04T17:00:00Z', match_num: 88,
    ph: '2nd Group D', pa: '2nd Group G' },

  // ── Round of 16 ─────────────────────────────────────────────────────────────
  { external_id: '537376', stage: 'round_of_16', kickoff: '2026-07-04T20:00:00Z', match_num: 89,
    ph: 'Winner Match 73', pa: 'Winner Match 75' },
  { external_id: '537375', stage: 'round_of_16', kickoff: '2026-07-04T23:00:00Z', match_num: 90,
    ph: 'Winner Match 74', pa: 'Winner Match 77' },
  { external_id: '537377', stage: 'round_of_16', kickoff: '2026-07-05T20:00:00Z', match_num: 91,
    ph: 'Winner Match 76', pa: 'Winner Match 78' },
  { external_id: '537378', stage: 'round_of_16', kickoff: '2026-07-06T20:00:00Z', match_num: 92,
    ph: 'Winner Match 79', pa: 'Winner Match 80' },
  { external_id: '537379', stage: 'round_of_16', kickoff: '2026-07-06T23:00:00Z', match_num: 93,
    ph: 'Winner Match 83', pa: 'Winner Match 84' },
  { external_id: '537380', stage: 'round_of_16', kickoff: '2026-07-07T17:00:00Z', match_num: 94,
    ph: 'Winner Match 81', pa: 'Winner Match 82' },
  { external_id: '537381', stage: 'round_of_16', kickoff: '2026-07-07T20:00:00Z', match_num: 95,
    ph: 'Winner Match 86', pa: 'Winner Match 88' },
  { external_id: '537382', stage: 'round_of_16', kickoff: '2026-07-07T23:00:00Z', match_num: 96,
    ph: 'Winner Match 85', pa: 'Winner Match 87' },

  // ── Quarter-Finals ──────────────────────────────────────────────────────────
  { external_id: '537383', stage: 'quarter_final', kickoff: '2026-07-09T20:00:00Z', match_num: 97,
    ph: 'Winner Match 89', pa: 'Winner Match 90' },
  { external_id: '537384', stage: 'quarter_final', kickoff: '2026-07-10T20:00:00Z', match_num: 98,
    ph: 'Winner Match 93', pa: 'Winner Match 94' },
  { external_id: '537385', stage: 'quarter_final', kickoff: '2026-07-11T20:00:00Z', match_num: 99,
    ph: 'Winner Match 91', pa: 'Winner Match 92' },
  { external_id: '537386', stage: 'quarter_final', kickoff: '2026-07-12T20:00:00Z', match_num: 100,
    ph: 'Winner Match 95', pa: 'Winner Match 96' },

  // ── Semi-Finals ──────────────────────────────────────────────────────────────
  { external_id: '537387', stage: 'semi_final', kickoff: '2026-07-14T23:00:00Z', match_num: 101,
    ph: 'Winner Match 97', pa: 'Winner Match 98' },
  { external_id: '537388', stage: 'semi_final', kickoff: '2026-07-15T23:00:00Z', match_num: 102,
    ph: 'Winner Match 99', pa: 'Winner Match 100' },

  // ── Third Place ──────────────────────────────────────────────────────────────
  { external_id: '537389', stage: 'third_place', kickoff: '2026-07-18T20:00:00Z', match_num: 103,
    ph: 'Loser Match 101', pa: 'Loser Match 102' },

  // ── Final ────────────────────────────────────────────────────────────────────
  { external_id: '537390', stage: 'final', kickoff: '2026-07-19T20:00:00Z', match_num: 104,
    ph: 'Winner Match 101', pa: 'Winner Match 102' },
]

let inserted = 0, skipped = 0

for (const m of BRACKET) {
  // Check if already in DB with real teams
  const { data: existing } = await supabase
    .from('matches')
    .select('id, home_team_id')
    .eq('external_id', m.external_id)
    .single()

  if (existing?.home_team_id) {
    // Real teams already assigned — just update placeholder text in case it's missing
    await supabase.from('matches')
      .update({ placeholder_home: m.ph, placeholder_away: m.pa })
      .eq('external_id', m.external_id)
    skipped++
    continue
  }

  const row = {
    home_team_id:     null,
    away_team_id:     null,
    stage:            m.stage,
    group_name:       null,
    kickoff_at:       m.kickoff,
    status:           'scheduled',
    home_elo:         1700,   // neutral placeholder ELO
    away_elo:         1700,
    stage_multiplier: STAGE_MULT[m.stage],
    external_id:      m.external_id,
    placeholder_home: m.ph,
    placeholder_away: m.pa,
  }

  if (existing) {
    await supabase.from('matches').update(row).eq('external_id', m.external_id)
  } else {
    await supabase.from('matches').insert(row)
  }
  inserted++
  console.log(`  ✓ Match ${m.match_num}: ${m.ph} vs ${m.pa}`)
}

console.log(`\n✅ ${inserted} placeholder matches inserted, ${skipped} already have real teams`)
