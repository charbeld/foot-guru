import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateScore } from '@/lib/scoring'
import type { MatchStage, PredictionOutcome } from '@/types'

// Called by cron-job.org every 5 minutes during the tournament
// Fetches finished match results from football-data.org and scores predictions
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  let synced = 0

  // ── 1. Score already-finished matches that have unscored predictions ──────
  // (covers manually-entered scores and dummy matches without external_id)
  const { data: finishedMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'finished')
    .not('home_score', 'is', null)

  for (const match of finishedMatches ?? []) {
    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', match.id)
      .eq('is_locked', true)
      .is('points_earned', null)

    if (!predictions?.length) continue

    for (const pred of predictions) {
      const result = calculateScore({
        homeScore:        match.home_score,
        awayScore:        match.away_score,
        predictedOutcome: pred.predicted_outcome as PredictionOutcome,
        predictedHome:    pred.predicted_home,
        predictedAway:    pred.predicted_away,
        homeElo:          match.home_elo,
        awayElo:          match.away_elo,
        stage:            match.stage as MatchStage,
      })
      await supabase.from('predictions').update({
        outcome_correct:     result.outcomeCorrect,
        exact_score_correct: result.exactScoreCorrect,
        elo_multiplier:      result.eloMultiplier,
        points_earned:       result.pointsEarned,
      }).eq('id', pred.id)
    }
    synced++
  }

  // ── 2. Sync live matches from football-data.org (real tournament) ─────────
  const { data: liveMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'live')

  for (const match of liveMatches ?? []) {
    if (!match.external_id) continue

    const res = await fetch(
      `https://api.football-data.org/v4/matches/${match.external_id}`,
      { headers: { 'X-Auth-Token': apiKey! } }
    )
    if (!res.ok) continue

    const data = await res.json()
    const score = data.score?.fullTime
    if (!score || data.status !== 'FINISHED') continue

    const homeScore: number = score.home ?? 0
    const awayScore: number = score.away ?? 0

    await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
      .eq('id', match.id)

    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', match.id)
      .eq('is_locked', true)
      .is('points_earned', null)

    for (const pred of predictions ?? []) {
      const result = calculateScore({
        homeScore,
        awayScore,
        predictedOutcome: pred.predicted_outcome as PredictionOutcome,
        predictedHome:    pred.predicted_home,
        predictedAway:    pred.predicted_away,
        homeElo:          match.home_elo,
        awayElo:          match.away_elo,
        stage:            match.stage as MatchStage,
      })
      await supabase.from('predictions').update({
        outcome_correct:     result.outcomeCorrect,
        exact_score_correct: result.exactScoreCorrect,
        elo_multiplier:      result.eloMultiplier,
        points_earned:       result.pointsEarned,
      }).eq('id', pred.id)
    }
    synced++
  }

  return NextResponse.json({ synced })
}
