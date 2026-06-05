import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { nanoid } from 'nanoid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateInviteCode(): string {
  return nanoid(8).toUpperCase()
}

export function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC'
}

export function isPredictionLocked(kickoffAt: string): boolean {
  return new Date() >= new Date(kickoffAt)
}

export function timeUntilKickoff(kickoffAt: string): string {
  const ms = new Date(kickoffAt).getTime() - Date.now()
  if (ms <= 0) return 'Locked'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 48) return `${Math.floor(h / 24)}d`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
