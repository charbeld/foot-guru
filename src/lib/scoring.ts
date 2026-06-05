import type { MatchStage, PredictionOutcome, ScoringResult } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_OUTCOME_POINTS = 5
const EXACT_SCORE_BONUS   = 8

export const STAGE_MULTIPLIERS: Record<MatchStage, number> = {
  group:        1.0,
  round_of_16:  1.5,
  quarter_final: 2.0,
  semi_final:   2.5,
  third_place:  2.0,
  final:        3.0,
}

export const STAGE_LABELS: Record<MatchStage, string> = {
  group:        'Group Stage',
  round_of_16:  'Round of 16',
  quarter_final: 'Quarter-Final',
  semi_final:   'Semi-Final',
  third_place:  'Third Place',
  final:        'Final',
}

// ─── ELO upset multiplier ─────────────────────────────────────────────────────
// Only applied when predicting the underdog correctly.
// "Underdog" = the team with the lower ELO.
export function getEloMultiplier(
  eloGap: number,
  predictedOutcome: PredictionOutcome,
  homeElo: number,
  awayElo: number,
): number {
  const favoriteIsHome = homeElo >= awayElo
  const predictedUnderdog =
    (favoriteIsHome && predictedOutcome === 'away') ||
    (!favoriteIsHome && predictedOutcome === 'home')

  // No upset bonus for picking the favorite
  if (!predictedUnderdog) return 1.0

  if (eloGap <= 50)  return 1.0
  if (eloGap <= 150) return 1.5
  if (eloGap <= 300) return 2.0
  return 3.0
}

// ─── Core scoring function ────────────────────────────────────────────────────
export function calculateScore(params: {
  homeScore: number
  awayScore: number
  predictedOutcome: PredictionOutcome
  predictedHome: number | null
  predictedAway: number | null
  homeElo: number
  awayElo: number
  stage: MatchStage
}): ScoringResult {
  const { homeScore, awayScore, predictedOutcome, predictedHome, predictedAway, homeElo, awayElo, stage } = params

  // Determine actual outcome
  const actualOutcome: PredictionOutcome =
    homeScore > awayScore ? 'home' :
    homeScore < awayScore ? 'away' : 'draw'

  const outcomeCorrect = predictedOutcome === actualOutcome

  const exactScoreCorrect =
    outcomeCorrect &&
    predictedHome !== null &&
    predictedAway !== null &&
    predictedHome === homeScore &&
    predictedAway === awayScore

  if (!outcomeCorrect) {
    return {
      outcomeCorrect: false,
      exactScoreCorrect: false,
      eloMultiplier: 1.0,
      stageMultiplier: STAGE_MULTIPLIERS[stage],
      pointsEarned: 0,
      breakdown: 'Wrong outcome — 0 pts',
    }
  }

  const eloGap = Math.abs(homeElo - awayElo)
  const eloMultiplier = getEloMultiplier(eloGap, predictedOutcome, homeElo, awayElo)
  const stageMultiplier = STAGE_MULTIPLIERS[stage]

  const base = BASE_OUTCOME_POINTS + (exactScoreCorrect ? EXACT_SCORE_BONUS : 0)
  const pointsEarned = Math.round(base * eloMultiplier * stageMultiplier)

  const parts: string[] = []
  parts.push(`${BASE_OUTCOME_POINTS} (outcome)`)
  if (exactScoreCorrect) parts.push(`+${EXACT_SCORE_BONUS} (exact score)`)
  if (eloMultiplier > 1)  parts.push(`×${eloMultiplier} (upset bonus)`)
  if (stageMultiplier > 1) parts.push(`×${stageMultiplier} (${STAGE_LABELS[stage]})`)

  return {
    outcomeCorrect,
    exactScoreCorrect,
    eloMultiplier,
    stageMultiplier,
    pointsEarned,
    breakdown: parts.join(' ') + ` = ${pointsEarned} pts`,
  }
}

// ─── Max possible points per match (for display) ─────────────────────────────
export function maxPointsForMatch(stage: MatchStage, eloGap: number): number {
  const stageMultiplier = STAGE_MULTIPLIERS[stage]
  const eloMultiplier = eloGap > 300 ? 3.0 : eloGap > 150 ? 2.0 : eloGap > 50 ? 1.5 : 1.0
  return Math.round((BASE_OUTCOME_POINTS + EXACT_SCORE_BONUS) * eloMultiplier * stageMultiplier)
}
