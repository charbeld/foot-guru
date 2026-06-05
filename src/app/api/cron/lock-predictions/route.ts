import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Called by cron-job.org every 5 minutes
// Locks all predictions for matches whose kickoff has passed
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Find matches that started but whose predictions aren't locked yet
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('id')
    .lte('kickoff_at', new Date().toISOString())
    .eq('status', 'scheduled')

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 })
  if (!matches?.length) return NextResponse.json({ locked: 0 })

  const matchIds = matches.map(m => m.id)

  // Lock predictions
  const { count: predCount, error: predError } = await supabase
    .from('predictions')
    .update({ is_locked: true })
    .in('match_id', matchIds)
    .eq('is_locked', false)

  if (predError) return NextResponse.json({ error: predError.message }, { status: 500 })

  // Update match status to live
  await supabase
    .from('matches')
    .update({ status: 'live' })
    .in('id', matchIds)

  return NextResponse.json({ locked: predCount ?? 0, matches: matchIds.length })
}
