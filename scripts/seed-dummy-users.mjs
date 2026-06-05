import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const USERS = [
  'golazo_king', 'penalty_pete', 'offside_omar', 'free_kick_fadi',
  'header_hana',  'volley_vince', 'dribble_dani', 'tackle_tara',
  'corner_carl',  'keeper_kira',  'striker_sam',  'midfield_mia',
]

const OUTCOMES = ['home', 'draw', 'away']

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function maybeScore() {
  // 60% chance of predicting exact score
  if (Math.random() > 0.4) {
    const h = randInt(0, 4)
    const a = randInt(0, 3)
    return { home: h, away: a }
  }
  return null
}

// ─── Create users ─────────────────────────────────────────────────────────────
console.log('Creating dummy users…')
const userIds = []

for (const username of USERS) {
  const email = `${username}@footguru.app`
  // Delete existing if any
  const { data: existing } = await supabase.auth.admin.listUsers()
  const found = existing?.users?.find(u => u.email === email)
  if (found) await supabase.auth.admin.deleteUser(found.id)

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'FootGuru2026!',
    email_confirm: true,
    user_metadata: { username, display_name: username },
  })

  if (error) { console.error(`  ✗ ${username}:`, error.message); continue }
  userIds.push({ id: data.user.id, username })
  console.log(`  ✓ ${username}`)
}

// ─── Fetch all matches ────────────────────────────────────────────────────────
const { data: matches } = await supabase
  .from('matches')
  .select('id, stage, kickoff_at, home_elo, away_elo, status')
  .order('kickoff_at')

// Only predict on scheduled matches (not finished/live — those are locked)
const predictable = matches.filter(m => m.status === 'scheduled')
console.log(`\nMaking predictions on ${predictable.length} upcoming matches for ${userIds.length} users…`)

// ─── Make random predictions ──────────────────────────────────────────────────
let total = 0
for (const { id: userId, username } of userIds) {
  // Each user skips 1-3 random matches (realistic — not everyone predicts all)
  const skipCount = randInt(1, 3)
  const skipped = new Set()
  while (skipped.size < skipCount) skipped.add(rand(predictable).id)

  for (const match of predictable) {
    if (skipped.has(match.id)) continue

    const outcome = rand(OUTCOMES)
    const score   = maybeScore()

    // Bias outcome slightly toward the higher-ELO team (realistic)
    const eloDiff = match.home_elo - match.away_elo
    const biasedOutcome = (() => {
      const r = Math.random()
      if (eloDiff > 150) return r < 0.55 ? 'home' : r < 0.75 ? 'draw' : 'away'
      if (eloDiff < -150) return r < 0.55 ? 'away' : r < 0.75 ? 'draw' : 'home'
      return rand(OUTCOMES)
    })()

    const { error } = await supabase.from('predictions').upsert({
      user_id:           userId,
      match_id:          match.id,
      predicted_outcome: biasedOutcome,
      predicted_home:    score?.home ?? null,
      predicted_away:    score?.away ?? null,
      is_locked:         false,
    }, { onConflict: 'user_id,match_id' })

    if (!error) total++
  }
}

console.log(`\n✅ Created ${userIds.length} users with ${total} total predictions`)
console.log('\nDummy user credentials (all same password):')
console.log('  Password: FootGuru2026!')
USERS.forEach(u => console.log(`  Username: ${u}`))
console.log('\nTell Claude to "sync" when you want to score the finished matches.')
