// Pushes the project's sensitive env vars to Vercel.
//
// SECURITY: never hardcode secret values in this file. All values are read from
// the local environment (e.g. your shell or a gitignored .env.local). Run with:
//
//   VERCEL_TOKEN=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   FOOTBALL_DATA_API_KEY=... \
//   CRON_SECRET=... \
//   node scripts/set-vercel-env.mjs
//
// VERCEL_TEAM_ID / VERCEL_PROJECT_ID may also be supplied via the environment.

const TOKEN   = process.env.VERCEL_TOKEN
const TEAM_ID = process.env.VERCEL_TEAM_ID
const PROJ_ID = process.env.VERCEL_PROJECT_ID

if (!TOKEN || !TEAM_ID || !PROJ_ID) {
  console.error('Missing VERCEL_TOKEN, VERCEL_TEAM_ID or VERCEL_PROJECT_ID in environment.')
  process.exit(1)
}

const SECRET_KEYS = ['SUPABASE_SERVICE_ROLE_KEY', 'FOOTBALL_DATA_API_KEY', 'CRON_SECRET']

const envVars = SECRET_KEYS.map(key => {
  const value = process.env[key]
  if (!value) {
    console.error(`Missing ${key} in environment.`)
    process.exit(1)
  }
  // sensitive: production + preview only (Vercel restriction)
  return { key, value, type: 'sensitive', target: ['production', 'preview'] }
})

for (const env of envVars) {
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${PROJ_ID}/env?teamId=${TEAM_ID}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
      body: JSON.stringify({ key: env.key, value: env.value, type: env.type, target: env.target }),
    }
  )
  const data = await res.json()
  if (res.status === 200 || res.status === 201) {
    console.log(`✓ ${env.key}`)
  } else {
    console.log(`✗ ${env.key}: ${data.error?.message ?? JSON.stringify(data)}`)
  }
}
