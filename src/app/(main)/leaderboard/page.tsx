import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: leaders } = await supabase
    .from('global_leaderboard')
    .select('*')
    .order('rank', { ascending: true })
    .limit(100)

  const currentUserRank = leaders?.find(l => l.id === user!.id)

  const rankBadge = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Global Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-1">Top 100 players · Updated live</p>
      </div>

      {/* Your rank callout */}
      {currentUserRank && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-green-400">{rankBadge(currentUserRank.rank)}</span>
            <div>
              <div className="font-bold text-white">Your ranking</div>
              <div className="text-sm text-gray-400">{currentUserRank.total_points} points</div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            {leaders && leaders.length > 0 && currentUserRank.rank <= leaders.length
              ? `Top ${Math.round((currentUserRank.rank / leaders.length) * 100)}%`
              : ''}
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      {!leaders?.length ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">🏆</div>
          <p>No predictions scored yet — check back after the first matches!</p>
        </div>
      ) : (
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Rank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Player</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Points</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader, i) => {
                const isMe = leader.id === user!.id
                return (
                  <tr key={leader.id}
                    className={`border-b border-white/5 last:border-0 transition-colors ${
                      isMe ? 'bg-green-500/5' : i % 2 === 0 ? 'bg-white/[0.02]' : ''
                    }`}>
                    <td className="px-4 py-3 text-sm font-bold text-gray-400 w-16">
                      {rankBadge(leader.rank)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {(leader.display_name ?? leader.username ?? '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className={`text-sm font-semibold ${isMe ? 'text-green-400' : 'text-white'}`}>
                            {leader.display_name ?? leader.username}
                            {isMe && <span className="ml-1 text-xs text-green-500">(you)</span>}
                          </div>
                          <div className="text-xs text-gray-600">@{leader.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-black text-white">{leader.total_points}</span>
                      <span className="text-xs text-gray-500 ml-1">pts</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
