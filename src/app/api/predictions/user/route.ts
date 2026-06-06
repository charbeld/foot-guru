import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify caller is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use admin client to bypass RLS so any authenticated user can view others' predictions
  const admin = await createAdminClient()
  const { data: predictions, error } = await admin
    .from('predictions')
    .select(`
      id, predicted_outcome, predicted_home, predicted_away,
      outcome_correct, exact_score_correct, points_earned, elo_multiplier,
      match:matches(
        id, stage, kickoff_at, home_score, away_score, status, elo_gap, stage_multiplier,
        home_team:teams!home_team_id(name, flag_url),
        away_team:teams!away_team_id(name, flag_url)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ predictions: predictions ?? [] })
}
