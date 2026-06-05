import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateScore } from '@/lib/scoring'
import type { MatchStage, PredictionOutcome } from '@/types'

// Runs every 5 minutes — detects finished matches and scores predictions.
// Predictions are considered eligible once kickoff_at has passed (no separate lock step needed —
// the API route already blocks late submissions, and the frontend locks the UI at kickoff).
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const apiKey   = process.env.FOOTBALL_DATA_API_KEY!
  const now      = new Date().toISOString()
  let synced = 0

  // ── 1. Move scheduled → live for matches past kickoff ─────────────────────
  await supabase
    .from('matches')
    .update({ status: 'live' })
    .eq('status', 'scheduled')
    .lte('kickoff_at', now)

  // ── 2. Check live matches against football-data.org for final scores ───────
  const { data: liveMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'live')
    .not('external_id', 'is', null)

  for (const match of liveMatches ?? []) {
    const res = await fetch(
      `https://api.football-data.org/v4/matches/${match.external_id}`,
      { headers: { 'X-Auth-Token': apiKey } }
    )
    if (!res.ok) continue

    const data = await res.json()
    if (data.status !== 'FINISHED') continue

    const homeScore: number = data.score?.fullTime?.home ?? 0
    const awayScore: number = data.score?.fullTime?.away ?? 0

    await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
      .eq('id', match.id)

    await scoreMatch(supabase, { ...match, home_score: homeScore, away_score: awayScore }, now)
    synced++
  }

  // ── 3. Score any finished matches with unscored predictions ────────────────
  // (catches manual score updates or matches missed by step 2)
  const { data: finishedMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'finished')
    .not('home_score', 'is', null)

  for (const match of finishedMatches ?? []) {
    const count = await scoreMatch(supabase, match, now)
    if (count > 0) synced++
  }

  return NextResponse.json({ synced })
}

async function scoreMatch(supabase: any, match: any, now: string): Promise<number> {
  // Eligible predictions: kickoff has passed + not yet scored
  // No is_locked check — kickoff time is the source of truth
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('match_id', match.id)
    .is('points_earned', null)
    .lte('created_at', match.kickoff_at) // submitted before kickoff

  if (!predictions?.length) return 0

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

  return predictions.length
}
