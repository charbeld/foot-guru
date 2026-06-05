import { createClient } from '@/lib/supabase/server'
import { LeaderboardClient } from './LeaderboardClient'

export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: leaders } = await supabase
    .from('global_leaderboard')
    .select('*')
    .order('rank', { ascending: true })
    .limit(100)

  return (
    <LeaderboardClient
      leaders={leaders ?? []}
      currentUserId={user!.id}
    />
  )
}
