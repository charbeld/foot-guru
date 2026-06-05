'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface LeagueMembership {
  league_id: string
  league: { id: string; name: string; invite_code: string; created_by: string } | null
}

interface LeagueStanding {
  league_id: string
  user_id: string
  username: string
  display_name: string | null
  total_points: number
  rank: number
}

interface LeaguesClientProps {
  memberships: LeagueMembership[]
  leagueStandings: LeagueStanding[]
  currentUserId: string
}

export function LeaguesClient({ memberships, leagueStandings, currentUserId }: LeaguesClientProps) {
  const router = useRouter()
  const [newLeagueName, setNewLeagueName] = useState('')
  const [inviteCode, setInviteCode]       = useState('')
  const [creating, setCreating]           = useState(false)
  const [joining, setJoining]             = useState(false)
  const [error, setError]                 = useState('')
  const [copiedCode, setCopiedCode]       = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newLeagueName.trim()) return
    setCreating(true); setError('')
    const res = await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLeagueName }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setCreating(false); return }
    setNewLeagueName('')
    setCreating(false)
    router.refresh()
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setJoining(true); setError('')
    const res = await fetch('/api/leagues/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: inviteCode }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setJoining(false); return }
    setInviteCode('')
    setJoining(false)
    router.refresh()
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Private Leagues</h1>
        <p className="text-gray-500 text-sm mt-1">Create or join a league to compete with friends</p>
      </div>

      {/* Create / Join */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-3">
          <h2 className="font-bold text-white">Create a League</h2>
          <Input
            value={newLeagueName}
            onChange={e => setNewLeagueName(e.target.value)}
            placeholder="League name"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} loading={creating} size="sm" className="w-full">
            Create League
          </Button>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-3">
          <h2 className="font-bold text-white">Join a League</h2>
          <Input
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Invite code (e.g. AB12CD34)"
            maxLength={8}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <Button onClick={handleJoin} loading={joining} size="sm" className="w-full" variant="secondary">
            Join League
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* League list */}
      {memberships.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">👥</div>
          <p>You&apos;re not in any leagues yet.</p>
          <p className="text-sm mt-1">Create one above and share the invite code with friends!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {memberships.map(({ league }) => {
            if (!league) return null
            const standings = leagueStandings.filter(s => s.league_id === league.id)
            return (
              <div key={league.id} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                {/* League header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div>
                    <h3 className="font-bold text-white">{league.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">Invite code:</span>
                      <code className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                        {league.invite_code}
                      </code>
                      <button
                        onClick={() => copyCode(league.invite_code)}
                        className="text-xs text-gray-500 hover:text-white transition-colors"
                      >
                        {copiedCode === league.invite_code ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{standings.length} member{standings.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Standings */}
                <table className="w-full">
                  <tbody>
                    {standings.map((s, i) => {
                      const isMe = s.user_id === currentUserId
                      return (
                        <tr key={s.user_id}
                          className={`border-b border-white/5 last:border-0 ${isMe ? 'bg-green-500/5' : ''}`}>
                          <td className="px-5 py-3 w-10 text-sm font-bold text-gray-500">
                            {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `#${s.rank}`}
                          </td>
                          <td className="px-2 py-3">
                            <span className={`text-sm font-semibold ${isMe ? 'text-green-400' : 'text-white'}`}>
                              {s.display_name ?? s.username}
                              {isMe && <span className="ml-1 text-xs text-green-600">(you)</span>}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-black text-white">
                            {s.total_points} <span className="text-xs font-normal text-gray-500">pts</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
