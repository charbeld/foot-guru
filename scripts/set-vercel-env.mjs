const TOKEN   = process.env.VERCEL_TOKEN
const TEAM_ID = process.env.VERCEL_TEAM_ID   ?? 'team_6C5vSUUymtRKMI4gSTqdeOMN'
const PROJ_ID = process.env.VERCEL_PROJECT_ID ?? 'prj_3kLljFUdTR3Ou8GsdubUdD5hmCZV'

const envVars = [
  // sensitive: production + preview only (Vercel restriction)
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZGdxaWd5c2htaW5hdnBza2xvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0ODUwMywiZXhwIjoyMDk2MjI0NTAzfQ.bfkBtgaYS_o5QbUH54ImfeZFAkPDAfWcIIwGQorM-sQ', type: 'sensitive', target: ['production', 'preview'] },
  { key: 'FOOTBALL_DATA_API_KEY',     value: 'd4c7bcc2dac14e1c87369a9297e9f247', type: 'sensitive', target: ['production', 'preview'] },
  { key: 'CRON_SECRET',               value: 'b08546ccf4488fdb4c8b9e2f54eb344017eeadbb981d0a0db2cd5fd3c222dc8b', type: 'sensitive', target: ['production', 'preview'] },
]

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
