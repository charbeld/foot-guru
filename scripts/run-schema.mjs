import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '../supabase/schema.sql'), 'utf8')

const PAT = process.env.SUPABASE_PAT
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'mpdgqigyshminavpsklo'

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${PAT}`,
  },
  body: JSON.stringify({ query: sql }),
})

const data = await res.json()
console.log('Status:', res.status)
console.log(JSON.stringify(data, null, 2))
