import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInviteCode } from '@/lib/utils'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'League name required' }, { status: 400 })

  const invite_code = generateInviteCode()

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .insert({ name: name.trim(), invite_code, created_by: user.id })
    .select()
    .single()

  if (leagueError) return NextResponse.json({ error: leagueError.message }, { status: 500 })

  // Auto-join creator
  await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })

  return NextResponse.json(league)
}
