import { createClient } from '@/lib/supabase/server'
import { MatchesClient } from './MatchesClient'

export const revalidate = 60

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase
      .from('matches')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
      .order('kickoff_at', { ascending: true }),
    supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user!.id),
  ])

  return <MatchesClient matches={matches ?? []} predictions={predictions ?? []} />
}
