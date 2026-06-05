const PAT    = process.env.SUPABASE_PAT
const REF    = process.env.SUPABASE_PROJECT_REF ?? 'mpdgqigyshminavpsklo'
const APP    = process.env.APP_URL ?? 'https://foot-guru.vercel.app'
const SECRET = process.env.CRON_SECRET

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
    body: JSON.stringify({ query: sql }),
  })
  return r.json()
}

// Remove old broken jobs
await q(`SELECT cron.unschedule('foot-guru-lock-predictions');`)
await q(`SELECT cron.unschedule('foot-guru-sync-results');`)
console.log('Removed old jobs')

// Recreate with positional args (no named params) — avoids type resolution issue
const lockSql = `
SELECT cron.schedule(
  'foot-guru-lock-predictions',
  '*/5 * * * *',
  $cron$
    SELECT extensions.http_get(
      '${APP}/api/cron/lock-predictions'::text,
      '{}'::jsonb,
      '{"Authorization": "Bearer ${SECRET}"}'::jsonb
    );
  $cron$
);`

const syncSql = `
SELECT cron.schedule(
  'foot-guru-sync-results',
  '*/5 * * * *',
  $cron$
    SELECT extensions.http_get(
      '${APP}/api/cron/sync-results'::text,
      '{}'::jsonb,
      '{"Authorization": "Bearer ${SECRET}"}'::jsonb
    );
  $cron$
);`

const lock = await q(lockSql)
console.log('lock job:', lock[0]?.schedule ?? JSON.stringify(lock))

const sync = await q(syncSql)
console.log('sync job:', sync[0]?.schedule ?? JSON.stringify(sync))

// Verify
const jobs = await q(`SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'foot-guru-%';`)
console.log('\nActive jobs:')
jobs.forEach(j => console.log(`  ${j.jobname} | ${j.schedule} | active=${j.active}`))
