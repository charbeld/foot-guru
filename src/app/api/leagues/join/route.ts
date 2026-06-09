import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invite_code } = await request.json()
  if (typeof invite_code !== 'string' || !invite_code.trim()) {
    return NextResponse.json({ error: 'Invite code required' }, { status: 400 })
  }

  // Lookup + membership insert happen atomically inside join_league(), which runs
  // as SECURITY DEFINER so clients never get SELECT on the full leagues table
  // (prevents enumerating every league's invite code).
  const { data, error } = await supabase.rpc('join_league', { p_invite_code: invite_code.trim() })

  if (error) {
    if (error.message.includes('Already a member')) {
      return NextResponse.json({ error: 'Already a member' }, { status: 409 })
    }
    if (error.message.includes('Invalid invite code')) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const league = Array.isArray(data) ? data[0] : data
  return NextResponse.json(league)
}
