import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invite_code } = await request.json()
  if (!invite_code) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('invite_code', invite_code.toUpperCase())
    .single()

  if (!league) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  const { error } = await supabase
    .from('league_members')
    .insert({ league_id: league.id, user_id: user.id })

  if (error?.code === '23505') {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 })
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(league)
}
