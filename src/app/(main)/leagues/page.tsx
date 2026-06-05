import { createClient } from '@/lib/supabase/server'
import { LeaguesClient } from './LeaguesClient'

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberships } = await supabase
    .from('league_members')
    .select('*, league:leagues(*)')
    .eq('user_id', user!.id)

  const leagueIds = memberships?.map(m => m.league_id) ?? []

  const { data: leagueStandings } = leagueIds.length > 0
    ? await supabase
        .from('league_leaderboard')
        .select('*')
        .in('league_id', leagueIds)
        .order('rank', { ascending: true })
    : { data: [] }

  return (
    <LeaguesClient
      memberships={memberships ?? []}
      leagueStandings={leagueStandings ?? []}
      currentUserId={user!.id}
    />
  )
}
