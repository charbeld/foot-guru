/**
 * Scores all predictions for finished matches that haven't been scored yet.
 * Useful for dummy/manually-entered matches without external_id.
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const STAGE_MULT = {
  group: 1.0, round_of_16: 1.5, quarter_final: 2.0,
  semi_final: 2.5, third_place: 2.0, final: 3.0,
}
const BASE = 5, EXACT_BONUS = 8

function eloMultiplier(eloGap, outcome, homeElo, awayElo) {
  const favoriteIsHome = homeElo >= awayElo
  const predictedUnderdog =
    (favoriteIsHome && outcome === 'away') || (!favoriteIsHome && outcome === 'home')
  if (!predictedUnderdog) return 1.0
  if (eloGap <= 50)  return 1.0
  if (eloGap <= 150) return 1.5
  if (eloGap <= 300) return 2.0
  return 3.0
}

const { data: matches } = await supabase
  .from('matches')
  .select('*')
  .eq('status', 'finished')
  .not('home_score', 'is', null)

console.log(`Found ${matches.length} finished matches`)
let totalScored = 0

for (const match of matches) {
  const { data: preds } = await supabase
    .from('predictions')
    .select('*')
    .eq('match_id', match.id)
    .eq('is_locked', true)
    .is('points_earned', null)

  if (!preds?.length) continue

  const actualOutcome =
    match.home_score > match.away_score ? 'home' :
    match.home_score < match.away_score ? 'away' : 'draw'

  for (const pred of preds) {
    const outcomeCorrect = pred.predicted_outcome === actualOutcome
    const exactCorrect = outcomeCorrect &&
      pred.predicted_home === match.home_score &&
      pred.predicted_away === match.away_score

    const eloMult = outcomeCorrect
      ? eloMultiplier(match.elo_gap, pred.predicted_outcome, match.home_elo, match.away_elo)
      : 1.0
    const stageMult = STAGE_MULT[match.stage]
    const points = outcomeCorrect
      ? Math.round((BASE + (exactCorrect ? EXACT_BONUS : 0)) * eloMult * stageMult)
      : 0

    await supabase.from('predictions').update({
      outcome_correct:     outcomeCorrect,
      exact_score_correct: exactCorrect,
      elo_multiplier:      eloMult,
      points_earned:       points,
    }).eq('id', pred.id)

    totalScored++
  }

  console.log(`  ✓ Scored ${preds.length} predictions for match ${match.id}`)
}

// Also lock predictions for finished/live matches that are still unlocked
await supabase
  .from('predictions')
  .update({ is_locked: true })
  .in('match_id', matches.map(m => m.id))
  .eq('is_locked', false)

console.log(`\n✅ Scored ${totalScored} predictions across ${matches.length} finished matches`)
