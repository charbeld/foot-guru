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

await q(`SELECT cron.unschedule('foot-guru-sync-fixtures');`)

const result = await q(`
  SELECT cron.schedule(
    'foot-guru-sync-fixtures',
    '0 6 * * *',
    $cron$
      SELECT extensions.http_get(
        '${APP}/api/cron/sync-fixtures'::text,
        '{}'::jsonb,
        '{"Authorization": "Bearer ${SECRET}"}'::jsonb
      );
    $cron$
  );
`)
console.log('fixture sync scheduled:', JSON.stringify(result))

const jobs = await q(`SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'foot-guru-%';`)
console.log('All active jobs:')
jobs.forEach(j => console.log(`  ${j.jobname} | ${j.schedule}`))
