'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/dashboard',   label: 'Dashboard' },
  { href: '/matches',     label: 'Matches' },
  { href: '/groups',      label: 'Groups' },
  { href: '/bracket',     label: 'Bracket' },
  { href: '/stats',       label: 'Stats' },
  { href: '/leaderboard', label: 'Leaderboard' },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-black text-xl tracking-tight">
          <span className="text-2xl">⚽</span>
          <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
            FootGuru
          </span>
          <span className="text-xs font-semibold text-gray-500 border border-gray-700 rounded px-1.5 py-0.5 ml-1">
            WC 2026
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-green-500/15 text-green-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/10',
              )}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-white/10 transition-colors gap-1.5"
          aria-label="Toggle menu"
        >
          <span className={cn('block h-0.5 w-5 bg-gray-300 transition-all duration-300', menuOpen && 'rotate-45 translate-y-2')} />
          <span className={cn('block h-0.5 w-5 bg-gray-300 transition-all duration-300', menuOpen && 'opacity-0')} />
          <span className={cn('block h-0.5 w-5 bg-gray-300 transition-all duration-300', menuOpen && '-rotate-45 -translate-y-2')} />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/80 backdrop-blur-xl px-4 py-3 flex flex-col gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-green-500/15 text-green-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/10',
              )}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="mt-1 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
