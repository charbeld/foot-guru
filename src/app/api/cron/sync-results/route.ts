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

  // Find live matches
  const { data: liveMatches } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
    .eq('status', 'live')

  if (!liveMatches?.length) return NextResponse.json({ synced: 0 })

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  let synced = 0

  for (const match of liveMatches) {
    if (!match.external_id) continue

    // Fetch from football-data.org
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

    // Update match as finished
    await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
      .eq('id', match.id)

    // Score all predictions for this match
    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', match.id)
      .eq('is_locked', true)
      .is('points_earned', null)

    if (!predictions?.length) continue

    for (const pred of predictions) {
      const result = calculateScore({
        homeScore,
        awayScore,
        predictedOutcome: pred.predicted_outcome as PredictionOutcome,
        predictedHome: pred.predicted_home,
        predictedAway: pred.predicted_away,
        homeElo: match.home_elo,
        awayElo: match.away_elo,
        stage: match.stage as MatchStage,
      })

      await supabase
        .from('predictions')
        .update({
          outcome_correct:      result.outcomeCorrect,
          exact_score_correct:  result.exactScoreCorrect,
          elo_multiplier:       result.eloMultiplier,
          points_earned:        result.pointsEarned,
        })
        .eq('id', pred.id)
    }

    synced++
  }

  return NextResponse.json({ synced })
}
