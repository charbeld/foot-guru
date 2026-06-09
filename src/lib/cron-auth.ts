import { timingSafeEqual } from 'node:crypto'

// Constant-time comparison of the Authorization header against CRON_SECRET.
// Avoids leaking the secret length/prefix through early-exit timing differences.
export function isAuthorizedCron(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const expected = `Bearer ${secret}`
  const provided = authHeader ?? ''

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
