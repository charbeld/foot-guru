import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('predictions')
    .select('*, match:matches(*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { match_id, predicted_outcome, predicted_home, predicted_away } = body

  // Validate match exists and is not locked
  const { data: match } = await supabase
    .from('matches')
    .select('id, kickoff_at, status')
    .eq('id', match_id)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  if (new Date() >= new Date(match.kickoff_at)) {
    return NextResponse.json({ error: 'Predictions are locked for this match' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('predictions')
    .upsert(
      {
        user_id: user.id,
        match_id,
        predicted_outcome,
        predicted_home: predicted_home ?? null,
        predicted_away: predicted_away ?? null,
        is_locked: false,
      },
      { onConflict: 'user_id,match_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
