#!/usr/bin/env node
// scripts/sync-from-wikipedia.mjs
// Syncs 2026 WC match data (kickoff times, wiki_url) from Wikipedia.
// Run: node scripts/sync-from-wikipedia.mjs
//
// Wikipedia pages used (hardcoded):
//   Group A–L : https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_{X}
//   Schedule  : https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_schedule
//   Statistics: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_statistics

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, '../.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const eq = line.indexOf('=')
      if (eq === -1 || line.startsWith('#')) continue
      process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
    }
  } catch {}
}
loadEnv()

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ─── Hardcoded Wikipedia URLs ─────────────────────────────────────────────────
export const WIKI_URLS = {
  schedule:      'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_schedule',
  knockoutStage: 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage',
  statistics:    'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_statistics',
  groups: Object.fromEntries(
    'ABCDEFGHIJKL'.split('').map(g => [
      g, `https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_${g}`,
    ]),
  ),
}

// ─── Fetch wikitext (with retry on 429) ──────────────────────────────────────
async function fetchWikitext(url, attempt = 0) {
  const title = decodeURIComponent(url.split('/wiki/')[1])
  const api = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json`
  const res = await fetch(api, { headers: { 'User-Agent': 'FootGuru-WC2026/1.0' } })
  if (res.status === 429) {
    if (attempt >= 3) throw new Error('HTTP 429 (rate limited after 3 retries)')
    const wait = (attempt + 1) * 5000
    process.stdout.write(` [429, retry in ${wait/1000}s] `)
    await new Promise(r => setTimeout(r, wait))
    return fetchWikitext(url, attempt + 1)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.parse?.wikitext?.['*'] ?? ''
}

// ─── Template extraction ──────────────────────────────────────────────────────
// Handles both legacy {{Football box}} and 2026-style {{#invoke:football box|main}}
const MARKERS = ['{{#invoke:football box|main', '{{Football box']

function* extractFootballBoxes(text) {
  for (const marker of MARKERS) {
    let pos = 0
    while (true) {
      const start = text.indexOf(marker, pos)
      if (start === -1) break
      let depth = 0, i = start
      while (i < text.length) {
        if (text[i] === '{' && text[i + 1] === '{')       { depth++; i += 2 }
        else if (text[i] === '}' && text[i + 1] === '}')  { depth--; i += 2; if (depth === 0) break }
        else i++
      }
      yield { fields: parseTemplateFields(text.slice(start + 2, i - 2)), markerUsed: marker }
      pos = i
    }
  }
}

// Parse | key = value fields respecting nested {{ }}
function parseTemplateFields(body) {
  const fields = {}
  let depth = 0, key = null, buf = ''
  for (let i = 0; i < body.length; i++) {
    const c = body[i], n = body[i + 1]
    if      (c === '{' && n === '{') { depth++; buf += c }
    else if (c === '}' && n === '}') { depth--; buf += c }
    else if (c === '|' && depth === 0) {
      if (key !== null) fields[key.trim()] = buf.trim()
      buf = ''; key = null
    } else if (c === '=' && depth === 0 && key === null) {
      key = buf; buf = ''
    } else buf += c
  }
  if (key !== null) fields[key.trim()] = buf.trim()
  return fields
}

// ─── Field parsers ────────────────────────────────────────────────────────────

// {{Start date|YYYY|M|D}} or plain "11 June 2026"
function parseWikiDate(val) {
  const m = val.match(/\{\{[Ss]tart[_ ]date\|(\d{4})\|(\d{1,2})\|(\d{1,2})/)
  if (m) return { y: +m[1], mo: +m[2], d: +m[3] }
  const MONTHS = {january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12}
  const m2 = val.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (m2) { const mo = MONTHS[m2[2].toLowerCase()]; if (mo) return { y: +m2[3], mo, d: +m2[1] } }
  return null
}

// Parses time in two formats:
//   Legacy: "19:00" with separate tz field (e.g. tz=UTC)
//   2026:   "1:00 p.m. UTC−6" (local time with UTC offset embedded)
// Returns UTC {h, m} object
function parseWikiTime(timeVal, tzVal) {
  if (!timeVal) return null

  // Normalise HTML entities and wikilinks
  const norm = timeVal
    .replace(/&nbsp;/g, ' ')
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1')
    .trim()

  // ── Format 1: "HH:MM" (24-hour, UTC) with separate tz abbreviation ──
  const h24 = norm.match(/^(\d{1,2}):(\d{2})$/)
  if (h24) {
    let h = +h24[1], m = +h24[2]
    const TZ_OFFSETS = { UTC:0,GMT:0,CET:-1,CEST:-2,EDT:4,EST:5,CDT:5,CST:6,MDT:6,MST:7,PDT:7,PST:8 }
    const off = TZ_OFFSETS[(tzVal || 'UTC').toUpperCase()] ?? 0
    return { h: h + off, m }
  }

  // ── Format 2: "H:MM a.m./p.m. UTC±X" (local time + embedded offset) ──
  const ampm = norm.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.|am|pm)/i)
  if (!ampm) return null

  let h = +ampm[1], min = +ampm[2]
  const suffix = ampm[3].replace(/\./g, '').toLowerCase()
  if (suffix === 'pm' && h !== 12) h += 12
  if (suffix === 'am' && h === 12) h = 0

  // UTC offset: "UTC−6", "UTC-06:00", "UTC+3" (− is Unicode minus)
  const offMatch = norm.match(/UTC([+\-−])(\d{1,2})(?::(\d{2}))?/)
  let utcOff = 0
  if (offMatch) {
    const sign = offMatch[1] === '+' ? 1 : -1
    utcOff = sign * +offMatch[2]
  }

  // UTC = local − offset  (e.g. 1pm UTC-6 → 13 - (-6) = 19:00 UTC)
  return { h: h - utcOff, m: min }
}

// Build UTC ISO string from date + parsed time
function toUTC(dateObj, wikiTime) {
  if (!dateObj || !wikiTime) return null
  const d = new Date(Date.UTC(dateObj.y, dateObj.mo - 1, dateObj.d, wikiTime.h, wikiTime.m))
  return d.toISOString()
}

// Extract 2–4 letter team code from:
//   {{#invoke:flag|fb|MEX}}, {{#invoke:flag|fb-rt|MEX}},
//   {{fb|MEX}}, {{fbb|MEX}}
//   or plain country name as fallback
function extractTeamCode(val) {
  if (!val) return null
  const invoke = val.match(/\{\{#invoke:flag\|fb(?:-rt|-r)?\|([A-Z]{2,4})\}\}/)
  if (invoke) return invoke[1]
  const fb = val.match(/\{\{fb(?:b|-rt|-r)?\|([A-Z]{2,4})\}\}/)
  if (fb) return fb[1]
  // strip templates and links, return plain name
  return val
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1')
    .trim() || null
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching teams from DB…')
  const { data: teams, error: teamsErr } = await sb.from('teams').select('id, name, code')
  if (teamsErr) { console.error('Teams error:', teamsErr.message); process.exit(1) }

  const byCode = Object.fromEntries((teams ?? []).map(t => [t.code?.toUpperCase(), t]))
  const byName = Object.fromEntries((teams ?? []).map(t => [
    t.name.toLowerCase().replace(/[^a-z]/g, ''), t,
  ]))

  // Known code aliases between Wikipedia football templates and our DB codes
  const ALIASES = {
    ENG:'ENG', WAL:'WAL', SCO:'SCO', NIR:'NIR',
    RSA:'ZAF', ZAF:'ZAF', // South Africa — Wikipedia uses RSA, ISO uses ZAF
    KOR:'KOR', PRK:'PRK',
    CIV:'CIV', COD:'COD', CGO:'CGO',
    BIH:'BIH', CZE:'CZE',
    NED:'NED', SUI:'SUI', URU:'URU',
    MEX:'MEX', USA:'USA', CAN:'CAN',
    AUS:'AUS', NZL:'NZL',
    ALG:'DZA', MAR:'MAR', SEN:'SEN', TUN:'TUN',
    GHA:'GHA', EGY:'EGY', UZB:'UZB',
    IRQ:'IRQ', JOR:'JOR', SAU:'SAU', IRN:'IRN',
    CPV:'CPV', HTI:'HTI',
  }

  function resolveTeam(code) {
    if (!code) return null
    const up = code.toUpperCase()
    if (byCode[up]) return byCode[up]
    const aliased = ALIASES[up]
    if (aliased && byCode[aliased]) return byCode[aliased]
    const norm = code.toLowerCase().replace(/[^a-z]/g, '')
    return byName[norm] ?? null
  }

  console.log('Fetching matches from DB…')
  const { data: dbMatches } = await sb
    .from('matches')
    .select('id, external_id, kickoff_at, stage, home_team_id, away_team_id, home_score, away_score, status, wiki_url')

  // Index group matches by team pair
  const matchByTeams = {}
  for (const m of dbMatches ?? []) {
    if (m.home_team_id && m.away_team_id)
      matchByTeams[`${m.home_team_id}_${m.away_team_id}`] = m
  }

  let timeUpdates = 0, wikiTagged = 0, errors = 0

  // ── Group pages ───────────────────────────────────────────────────────────
  for (const [group, url] of Object.entries(WIKI_URLS.groups)) {
    process.stdout.write(`Group ${group} … `)
    let wikitext
    try { wikitext = await fetchWikitext(url) }
    catch (e) { console.log(`⚠ ${e.message}`); errors++; continue }

    let found = 0, boxCount = 0
    for (const { fields } of extractFootballBoxes(wikitext)) {
      boxCount++
      const dateObj  = parseWikiDate(fields.date ?? '')
      const wikiTime = parseWikiTime(fields.time, fields.tz)
      const utcTime  = toUTC(dateObj, wikiTime)
      const code1    = extractTeamCode(fields.team1)
      const code2    = extractTeamCode(fields.team2)
      const team1    = resolveTeam(code1)
      const team2    = resolveTeam(code2)

      if (!team1 || !team2) {
        console.log(`\n  ⚠ Unresolved teams: "${code1}" → ${team1?.name ?? '?'}, "${code2}" → ${team2?.name ?? '?'}`)
        continue
      }

      const dbMatch = matchByTeams[`${team1.id}_${team2.id}`]
      if (!dbMatch) {
        console.log(`\n  ⚠ No DB match for ${team1.name} vs ${team2.name}`)
        continue
      }

      found++
      const updates = { wiki_url: url }

      if (utcTime) {
        const diff = Math.abs(new Date(utcTime).getTime() - new Date(dbMatch.kickoff_at).getTime())
        if (diff > 60_000) {
          const oldT = new Date(dbMatch.kickoff_at).toLocaleString('en-GB',{timeZone:'Asia/Beirut',weekday:'short',hour:'2-digit',minute:'2-digit'})
          const newT = new Date(utcTime).toLocaleString('en-GB',{timeZone:'Asia/Beirut',weekday:'short',hour:'2-digit',minute:'2-digit'})
          console.log(`\n  🕐 ${team1.name} vs ${team2.name}: ${oldT} → ${newT} (Beirut)`)
          updates.kickoff_at = utcTime
          timeUpdates++
        }
      }

      const { error } = await sb.from('matches').update(updates).eq('id', dbMatch.id)
      if (error) { console.log(`\n  ❌ ${error.message}`); errors++ }
      else wikiTagged++
    }
    console.log(`${found}/${boxCount} matches tagged`)
    await new Promise(r => setTimeout(r, 1200))
  }

  // ── Knockout stage page ───────────────────────────────────────────────────
  console.log(`\nFetching knockout stage times from Wikipedia…`)

  // Map Wikipedia level-2 section headings → our stage values
  const HEADING_TO_STAGE = {
    'round of 32':          'round_of_32',
    'round of 16':          'round_of_16',
    'quarterfinals':        'quarter_final',
    'quarter-finals':       'quarter_final',
    'quarter finals':       'quarter_final',
    'semifinals':           'semi_final',
    'semi-finals':          'semi_final',
    'semi finals':          'semi_final',
    'match for third place':'third_place',
    'third-place match':    'third_place',
    'third place match':    'third_place',
    'final':                'final',
  }

  // Split wikitext into LEVEL-2 sections only (== heading == not ===)
  function splitBySections(text) {
    const out = []
    // Match exactly two = signs (not three or more)
    const re = /^==(?!=)\s*([^=]+?)\s*==(?!=)/gm
    let lastIdx = 0, lastHeading = ''
    let m
    while ((m = re.exec(text)) !== null) {
      if (lastIdx > 0) out.push({ heading: lastHeading, text: text.slice(lastIdx, m.index) })
      lastIdx = m.index + m[0].length
      lastHeading = m[1].trim()
    }
    out.push({ heading: lastHeading, text: text.slice(lastIdx) })
    return out
  }

  try {
    const ksText = await fetchWikitext(WIKI_URLS.knockoutStage)
    const sections = splitBySections(ksText)

    // Index DB knockout matches by stage, sorted by kickoff_at asc
    const knockoutByStage = {}
    for (const m of (dbMatches ?? []).filter(m => m.stage !== 'group')) {
      ;(knockoutByStage[m.stage] ??= []).push(m)
    }
    for (const arr of Object.values(knockoutByStage))
      arr.sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))

    let ksTagged = 0
    for (const { heading, text } of sections) {
      const stage = HEADING_TO_STAGE[heading.toLowerCase()]
      if (!stage) continue

      // Collect all Wikipedia times for this section, sorted asc
      const wikiTimes = []
      for (const { fields } of extractFootballBoxes(text)) {
        const dateObj  = parseWikiDate(fields.date ?? '')
        const wikiTime = parseWikiTime(fields.time, fields.tz)
        const utcTime  = toUTC(dateObj, wikiTime)
        if (utcTime) wikiTimes.push(utcTime)
      }
      wikiTimes.sort()

      const dbArr = knockoutByStage[stage] ?? []
      if (wikiTimes.length === 0) continue
      console.log(`  ${stage}: ${wikiTimes.length} Wikipedia times, ${dbArr.length} DB matches`)

      // Positional match: Wikipedia box N ↔ DB match N (both sorted by time)
      for (let i = 0; i < Math.min(wikiTimes.length, dbArr.length); i++) {
        const utcTime = wikiTimes[i]
        const dbMatch = dbArr[i]
        const updates = { wiki_url: WIKI_URLS.knockoutStage }
        const diff = Math.abs(new Date(utcTime).getTime() - new Date(dbMatch.kickoff_at).getTime())
        if (diff > 60_000) {
          const oldT = new Date(dbMatch.kickoff_at).toLocaleString('en-GB',{timeZone:'Asia/Beirut',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
          const newT = new Date(utcTime).toLocaleString('en-GB',{timeZone:'Asia/Beirut',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
          console.log(`    🕐 ${stage} #${i+1}: ${oldT} → ${newT} (Beirut)`)
          updates.kickoff_at = utcTime
          timeUpdates++
        }
        const { error } = await sb.from('matches').update(updates).eq('id', dbMatch.id)
        if (error) { console.log(`    ❌ ${error.message}`); errors++ }
        else { wikiTagged++; ksTagged++ }
      }
    }
    console.log(`  Total knockout matches updated: ${ksTagged}`)
  } catch (e) {
    console.log(`  ⚠ Knockout stage error: ${e.message}`)
    console.error(e)
  }

  console.log(`
✅ Wikipedia sync complete
   wiki_url tagged : ${wikiTagged}
   time fixes      : ${timeUpdates}
   errors          : ${errors}
`)
}

main().catch(e => { console.error(e); process.exit(1) })
