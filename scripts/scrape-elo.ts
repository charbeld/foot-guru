/**
 * One-time ELO scraper for eloratings.net
 * Run once before the tournament: npx tsx scripts/scrape-elo.ts
 *
 * Fetches current ELO ratings for all 2026 World Cup teams,
 * then upserts them into the Supabase `teams` table.
 */

import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'

// ─── Official 2026 World Cup qualified teams (48 teams) ──────────────────────
// group_name left blank — to be set after the draw
const WORLD_CUP_2026_TEAMS: { name: string; code: string; flag_url: string; group_name: string }[] = [
  // AFC (Asia)
  { name: 'Australia',             code: 'AUS', flag_url: 'https://flagcdn.com/w80/au.png',     group_name: '' },
  { name: 'IR Iran',               code: 'IRN', flag_url: 'https://flagcdn.com/w80/ir.png',     group_name: '' },
  { name: 'Japan',                 code: 'JPN', flag_url: 'https://flagcdn.com/w80/jp.png',     group_name: '' },
  { name: 'Jordan',                code: 'JOR', flag_url: 'https://flagcdn.com/w80/jo.png',     group_name: '' },
  { name: 'Korea Republic',        code: 'KOR', flag_url: 'https://flagcdn.com/w80/kr.png',     group_name: '' },
  { name: 'Qatar',                 code: 'QAT', flag_url: 'https://flagcdn.com/w80/qa.png',     group_name: '' },
  { name: 'Saudi Arabia',          code: 'KSA', flag_url: 'https://flagcdn.com/w80/sa.png',     group_name: '' },
  { name: 'Uzbekistan',            code: 'UZB', flag_url: 'https://flagcdn.com/w80/uz.png',     group_name: '' },
  { name: 'Iraq',                  code: 'IRQ', flag_url: 'https://flagcdn.com/w80/iq.png',     group_name: '' },
  // CAF (Africa)
  { name: 'Algeria',               code: 'ALG', flag_url: 'https://flagcdn.com/w80/dz.png',     group_name: '' },
  { name: 'Cabo Verde',            code: 'CPV', flag_url: 'https://flagcdn.com/w80/cv.png',     group_name: '' },
  { name: "Côte d'Ivoire",         code: 'CIV', flag_url: 'https://flagcdn.com/w80/ci.png',     group_name: '' },
  { name: 'DR Congo',              code: 'COD', flag_url: 'https://flagcdn.com/w80/cd.png',     group_name: '' },
  { name: 'Egypt',                 code: 'EGY', flag_url: 'https://flagcdn.com/w80/eg.png',     group_name: '' },
  { name: 'Ghana',                 code: 'GHA', flag_url: 'https://flagcdn.com/w80/gh.png',     group_name: '' },
  { name: 'Morocco',               code: 'MAR', flag_url: 'https://flagcdn.com/w80/ma.png',     group_name: '' },
  { name: 'Senegal',               code: 'SEN', flag_url: 'https://flagcdn.com/w80/sn.png',     group_name: '' },
  { name: 'South Africa',          code: 'RSA', flag_url: 'https://flagcdn.com/w80/za.png',     group_name: '' },
  { name: 'Tunisia',               code: 'TUN', flag_url: 'https://flagcdn.com/w80/tn.png',     group_name: '' },
  // CONCACAF
  { name: 'Canada',                code: 'CAN', flag_url: 'https://flagcdn.com/w80/ca.png',     group_name: '' },
  { name: 'Mexico',                code: 'MEX', flag_url: 'https://flagcdn.com/w80/mx.png',     group_name: '' },
  { name: 'United States',         code: 'USA', flag_url: 'https://flagcdn.com/w80/us.png',     group_name: '' },
  { name: 'Curaçao',               code: 'CUW', flag_url: 'https://flagcdn.com/w80/cw.png',     group_name: '' },
  { name: 'Haiti',                 code: 'HAI', flag_url: 'https://flagcdn.com/w80/ht.png',     group_name: '' },
  { name: 'Panama',                code: 'PAN', flag_url: 'https://flagcdn.com/w80/pa.png',     group_name: '' },
  // CONMEBOL (South America)
  { name: 'Argentina',             code: 'ARG', flag_url: 'https://flagcdn.com/w80/ar.png',     group_name: '' },
  { name: 'Brazil',                code: 'BRA', flag_url: 'https://flagcdn.com/w80/br.png',     group_name: '' },
  { name: 'Colombia',              code: 'COL', flag_url: 'https://flagcdn.com/w80/co.png',     group_name: '' },
  { name: 'Ecuador',               code: 'ECU', flag_url: 'https://flagcdn.com/w80/ec.png',     group_name: '' },
  { name: 'Paraguay',              code: 'PAR', flag_url: 'https://flagcdn.com/w80/py.png',     group_name: '' },
  { name: 'Uruguay',               code: 'URU', flag_url: 'https://flagcdn.com/w80/uy.png',     group_name: '' },
  // OFC (Oceania)
  { name: 'New Zealand',           code: 'NZL', flag_url: 'https://flagcdn.com/w80/nz.png',     group_name: '' },
  // UEFA (Europe)
  { name: 'Austria',               code: 'AUT', flag_url: 'https://flagcdn.com/w80/at.png',     group_name: '' },
  { name: 'Belgium',               code: 'BEL', flag_url: 'https://flagcdn.com/w80/be.png',     group_name: '' },
  { name: 'Bosnia and Herzegovina',code: 'BIH', flag_url: 'https://flagcdn.com/w80/ba.png',     group_name: '' },
  { name: 'Croatia',               code: 'CRO', flag_url: 'https://flagcdn.com/w80/hr.png',     group_name: '' },
  { name: 'Czechia',               code: 'CZE', flag_url: 'https://flagcdn.com/w80/cz.png',     group_name: '' },
  { name: 'England',               code: 'ENG', flag_url: 'https://flagcdn.com/w80/gb-eng.png', group_name: '' },
  { name: 'France',                code: 'FRA', flag_url: 'https://flagcdn.com/w80/fr.png',     group_name: '' },
  { name: 'Germany',               code: 'GER', flag_url: 'https://flagcdn.com/w80/de.png',     group_name: '' },
  { name: 'Netherlands',           code: 'NED', flag_url: 'https://flagcdn.com/w80/nl.png',     group_name: '' },
  { name: 'Norway',                code: 'NOR', flag_url: 'https://flagcdn.com/w80/no.png',     group_name: '' },
  { name: 'Portugal',              code: 'POR', flag_url: 'https://flagcdn.com/w80/pt.png',     group_name: '' },
  { name: 'Scotland',              code: 'SCO', flag_url: 'https://flagcdn.com/w80/gb-sct.png', group_name: '' },
  { name: 'Spain',                 code: 'ESP', flag_url: 'https://flagcdn.com/w80/es.png',     group_name: '' },
  { name: 'Sweden',                code: 'SWE', flag_url: 'https://flagcdn.com/w80/se.png',     group_name: '' },
  { name: 'Switzerland',           code: 'SUI', flag_url: 'https://flagcdn.com/w80/ch.png',     group_name: '' },
  { name: 'Türkiye',               code: 'TUR', flag_url: 'https://flagcdn.com/w80/tr.png',     group_name: '' },
]

// ─── Scrape ELO from eloratings.net ──────────────────────────────────────────
async function scrapeEloRatings(): Promise<Map<string, number>> {
  const url = 'https://www.eloratings.net/'
  console.log(`Fetching ELO ratings from ${url}…`)

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WorldCupPredictorBot/1.0)',
    },
  })

  if (!res.ok) throw new Error(`HTTP ${res.status} from eloratings.net`)

  const html = await res.text()
  const $ = cheerio.load(html)
  const eloMap = new Map<string, number>()

  // eloratings.net table: each row has rank | team name | rating | ...
  $('table tbody tr, tr.odd, tr.even').each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length < 3) return
    const name   = $(cells[1]).text().trim()
    const rating = parseInt($(cells[2]).text().trim().replace(/,/g, ''), 10)
    if (name && !isNaN(rating)) eloMap.set(name, rating)
  })

  // Fallback: try text nodes that match "Team ... 1234"
  if (eloMap.size === 0) {
    const text = $('body').text()
    const lines = text.split('\n')
    for (const line of lines) {
      const m = line.trim().match(/^(.+?)\s+(\d{3,4})\s*$/)
      if (m) eloMap.set(m[1].trim(), parseInt(m[2], 10))
    }
  }

  console.log(`Found ${eloMap.size} teams on eloratings.net`)
  return eloMap
}

// ─── IOC 2-letter → FIFA team name mapping ───────────────────────────────────
// eloratings.net uses IOC codes (col 1), ELO is col 2
const IOC_TO_NAME: Record<string, string> = {
  ES: 'Spain',        AR: 'Argentina',   FR: 'France',      EN: 'England',
  BR: 'Brazil',       PT: 'Portugal',    CO: 'Colombia',    NL: 'Netherlands',
  EC: 'Ecuador',      DE: 'Germany',     UY: 'Uruguay',     BE: 'Belgium',
  US: 'United States',MX: 'Mexico',      HR: 'Croatia',     SN: 'Senegal',
  MA: 'Morocco',      JP: 'Japan',       DK: 'Denmark',     CH: 'Switzerland',
  AU: 'Australia',    RS: 'Serbia',      IR: 'Iran',        TR: 'Turkey',
  KR: 'South Korea',  NG: 'Nigeria',     GH: 'Ghana',       CM: 'Cameroon',
  DZ: 'Algeria',      PE: 'Peru',        HU: 'Hungary',     UA: 'Ukraine',
  SA: 'Saudi Arabia', VE: 'Venezuela',   AT: 'Austria',     QA: 'Qatar',
  CI: 'Ivory Coast',  TN: 'Tunisia',     PA: 'Panama',      HN: 'Honduras',
  NZ: 'New Zealand',  CA: 'Canada',      ZA: 'South Africa',IQ: 'Iraq',
  CR: 'Costa Rica',   IT: 'Italy',       CL: 'Chile',
}

// ─── Alternative: fetch TSV endpoint ─────────────────────────────────────────
async function scrapeEloJson(): Promise<Map<string, number>> {
  const url = 'https://www.eloratings.net/World.tsv'
  console.log(`Trying TSV endpoint: ${url}…`)

  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`TSV ${res.status}`)

  const text = await res.text()
  const eloMap = new Map<string, number>()

  for (const line of text.split('\n')) {
    const cols = line.split('\t')
    if (cols.length < 3) continue
    // col 0 = sequence, col 1 = rank, col 2 = IOC code, col 3 = current ELO
    const iocCode = cols[2]?.trim()
    const rating  = parseInt(cols[3]?.trim(), 10)
    if (!iocCode || isNaN(rating)) continue
    const name = IOC_TO_NAME[iocCode]
    if (name) eloMap.set(name, rating)
  }

  console.log(`Parsed ${eloMap.size} teams from TSV`)
  return eloMap
}

// ─── Name normalization helpers ───────────────────────────────────────────────
const NAME_ALIASES: Record<string, string> = {
  'USA':            'United States',
  'South Korea':    'Korea Republic',
  'Ivory Coast':    "Côte d'Ivoire",
  'Saudi Arabia':   'Saudi Arabia',
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s]/g, '').trim()
}

function findElo(teamName: string, eloMap: Map<string, number>): number | null {
  // Direct match
  if (eloMap.has(teamName)) return eloMap.get(teamName)!
  // Alias match
  const alias = NAME_ALIASES[teamName]
  if (alias && eloMap.has(alias)) return eloMap.get(alias)!
  // Fuzzy: normalized comparison
  const normTarget = normalize(teamName)
  for (const [key, val] of eloMap) {
    if (normalize(key) === normTarget) return val
  }
  // Partial match
  for (const [key, val] of eloMap) {
    if (normalize(key).includes(normTarget) || normTarget.includes(normalize(key))) return val
  }
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Try HTML scrape, fall back to TSV
  let eloMap: Map<string, number>
  try {
    eloMap = await scrapeEloRatings()
    if (eloMap.size < 10) throw new Error('Too few results from HTML')
  } catch (err) {
    console.warn('HTML scrape failed, trying TSV:', err)
    eloMap = await scrapeEloJson()
  }

  // Deduplicate teams by code
  const seen = new Set<string>()
  const teams = WORLD_CUP_2026_TEAMS.filter(t => {
    if (seen.has(t.code)) return false
    seen.add(t.code)
    return true
  })

  const rows = teams.map(team => {
    const elo = findElo(team.name, eloMap)
    const rating = elo ?? 1500
    if (!elo) console.warn(`  ⚠ No ELO found for "${team.name}" — defaulting to ${rating}`)
    else      console.log(`  ✓ ${team.name}: ${rating}`)
    return { ...team, elo_rating: rating }
  })

  console.log(`\nUpserting ${rows.length} teams into Supabase…`)

  const { error } = await supabase
    .from('teams')
    .upsert(rows, { onConflict: 'code' })

  if (error) {
    console.error('Supabase upsert error:', error)
    process.exit(1)
  }

  console.log('\n✅ ELO scrape complete!')
  console.log('Run this script again before the tournament starts to refresh ratings.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
