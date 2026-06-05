'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#080c0a]">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
            FootGuru
          </h1>
          <p className="text-gray-500 text-sm mt-1">World Cup 2026 Predictions</p>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email" label="Email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoComplete="email"
            />
            <Input
              id="password" label="Password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" loading={loading} className="w-full" size="md">
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          No account?{' '}
          <Link href="/signup" className="text-green-400 hover:text-green-300 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
