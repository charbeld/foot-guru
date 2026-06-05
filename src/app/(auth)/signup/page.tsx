'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Email is generated internally as username@footguru.app — users never see it
function usernameToEmail(username: string) {
  return `${username}@footguru.app`
}

export default function SignupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (username.length < 3) { setError('Username must be at least 3 characters'); return }
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: usernameToEmail(username),
      password,
      options: { data: { username, display_name: username } },
    })

    if (error) {
      setError(error.message === 'User already registered' ? 'Username already taken' : error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#080c0a]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
            FootGuru
          </h1>
          <p className="text-gray-500 text-sm mt-1">World Cup 2026 Predictions</p>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Create account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="username" label="Username" type="text" value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="your_username" required minLength={3} maxLength={20}
              autoComplete="username"
            />
            <Input
              id="password" label="Password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="min 8 characters" required minLength={8}
              autoComplete="new-password"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" loading={loading} className="w-full" size="md">
              Join the game
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-green-400 hover:text-green-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
