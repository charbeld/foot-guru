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

  const admin = createAdminClient()

  // Check if the target user has hidden their upcoming predictions
  const { data: profile } = await admin
    .from('profiles')
    .select('hide_pending_predictions')
    .eq('id', userId)
    .single()

  const isSelf = user.id === userId
  const hidePending = profile?.hide_pending_predictions === true && !isSelf

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

  const result = hidePending
    ? (predictions ?? []).filter((p: any) => p.match?.status === 'finished')
    : (predictions ?? [])

  return NextResponse.json({
    predictions: result,
    hiddenPending: hidePending,
    // Own profile: return the stored setting so the toggle shows the right state
    myHideSetting: isSelf ? (profile?.hide_pending_predictions ?? false) : undefined,
  })
}
