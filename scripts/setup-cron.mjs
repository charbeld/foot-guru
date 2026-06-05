/**
 * Sets up pg_cron + pg_net in Supabase to call cron endpoints every 5 minutes.
 * Runs entirely inside the existing Supabase project — no extra services needed.
 */
const PAT         = process.env.SUPABASE_PAT
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'mpdgqigyshminavpsklo'
const APP_URL     = process.env.APP_URL ?? 'https://foot-guru.vercel.app'
const CRON_SECRET = process.env.CRON_SECRET

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
    body: JSON.stringify({ query: sql }),
  })
  return { status: res.status, data: await res.json() }
}

// 1. Enable pg_net (allows HTTP calls from SQL)
console.log('Enabling pg_net extension…')
const net = await query(`CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;`)
console.log('pg_net:', net.status === 201 ? '✓' : JSON.stringify(net.data))

// 2. pg_cron is pre-enabled on Supabase — verify
console.log('Checking pg_cron…')
const cronCheck = await query(`SELECT cron.schedule('__test__', '59 23 31 2 *', 'SELECT 1'); SELECT cron.unschedule('__test__');`)
console.log('pg_cron:', cronCheck.status === 201 ? '✓' : JSON.stringify(cronCheck.data))

// 3. Remove any existing schedules for our jobs
console.log('Removing old schedules if any…')
await query(`SELECT cron.unschedule('foot-guru-lock-predictions') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'foot-guru-lock-predictions');`)
await query(`SELECT cron.unschedule('foot-guru-sync-results') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'foot-guru-sync-results');`)

// 4. Schedule lock-predictions every 5 minutes
console.log('Scheduling lock-predictions (every 5 min)…')
const lock = await query(`
  SELECT cron.schedule(
    'foot-guru-lock-predictions',
    '*/5 * * * *',
    $$
    SELECT extensions.http_get(
      url  := '${APP_URL}/api/cron/lock-predictions',
      params := '{}'::jsonb,
      headers := '{"Authorization": "Bearer ${CRON_SECRET}"}'::jsonb
    );
    $$
  );
`)
console.log('lock-predictions schedule:', lock.status === 201 ? '✓' : JSON.stringify(lock.data))

// 5. Schedule sync-results every 5 minutes (offset by 2 min so they don't clash)
console.log('Scheduling sync-results (every 5 min)…')
const sync = await query(`
  SELECT cron.schedule(
    'foot-guru-sync-results',
    '*/5 * * * *',
    $$
    SELECT extensions.http_get(
      url  := '${APP_URL}/api/cron/sync-results',
      params := '{}'::jsonb,
      headers := '{"Authorization": "Bearer ${CRON_SECRET}"}'::jsonb
    );
    $$
  );
`)
console.log('sync-results schedule:', sync.status === 201 ? '✓' : JSON.stringify(sync.data))

// 6. Verify both are registered
console.log('\nVerifying registered jobs…')
const jobs = await query(`SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'foot-guru-%';`)
console.log(JSON.stringify(jobs.data, null, 2))
console.log('\n✅ Cron jobs active inside Supabase — no external service needed!')
