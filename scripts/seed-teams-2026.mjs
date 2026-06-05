const PAT         = process.env.SUPABASE_PAT
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'mpdgqigyshminavpsklo'

const TEAMS = [
  // ── AFC (Asia) ─────────────────────────────────────────────────────────────
  { name: 'Australia',             code: 'AUS', elo_rating: 1774, confederation: 'AFC',      flag_url: 'https://flagcdn.com/w80/au.png' },
  { name: 'IR Iran',               code: 'IRN', elo_rating: 1772, confederation: 'AFC',      flag_url: 'https://flagcdn.com/w80/ir.png' },
  { name: 'Japan',                 code: 'JPN', elo_rating: 1906, confederation: 'AFC',      flag_url: 'https://flagcdn.com/w80/jp.png' },
  { name: 'Jordan',                code: 'JOR', elo_rating: 1685, confederation: 'AFC',      flag_url: 'https://flagcdn.com/w80/jo.png' },
  { name: 'Korea Republic',        code: 'KOR', elo_rating: 1758, confederation: 'AFC',      flag_url: 'https://flagcdn.com/w80/kr.png' },
  { name: 'Qatar',                 code: 'QAT', elo_rating: 1423, confederation: 'AFC',      flag_url: 'https://flagcdn.com/w80/qa.png' },
  { name: 'Saudi Arabia',          code: 'KSA', elo_rating: 1566, confederation: 'AFC',      flag_url: 'https://flagcdn.com/w80/sa.png' },
  { name: 'Uzbekistan',            code: 'UZB', elo_rating: 1718, confederation: 'AFC',      flag_url: 'https://flagcdn.com/w80/uz.png' },
  { name: 'Iraq',                  code: 'IRQ', elo_rating: 1618, confederation: 'AFC',      flag_url: 'https://flagcdn.com/w80/iq.png' },
  // ── CAF (Africa) ───────────────────────────────────────────────────────────
  { name: 'Algeria',               code: 'ALG', elo_rating: 1760, confederation: 'CAF',      flag_url: 'https://flagcdn.com/w80/dz.png' },
  { name: 'Cabo Verde',            code: 'CPV', elo_rating: 1576, confederation: 'CAF',      flag_url: 'https://flagcdn.com/w80/cv.png' },
  { name: "Côte d'Ivoire",         code: 'CIV', elo_rating: 1695, confederation: 'CAF',      flag_url: 'https://flagcdn.com/w80/ci.png' },
  { name: 'DR Congo',              code: 'COD', elo_rating: 1661, confederation: 'CAF',      flag_url: 'https://flagcdn.com/w80/cd.png' },
  { name: 'Egypt',                 code: 'EGY', elo_rating: 1699, confederation: 'CAF',      flag_url: 'https://flagcdn.com/w80/eg.png' },
  { name: 'Ghana',                 code: 'GHA', elo_rating: 1510, confederation: 'CAF',      flag_url: 'https://flagcdn.com/w80/gh.png' },
  { name: 'Morocco',               code: 'MAR', elo_rating: 1824, confederation: 'CAF',      flag_url: 'https://flagcdn.com/w80/ma.png' },
  { name: 'Senegal',               code: 'SEN', elo_rating: 1867, confederation: 'CAF',      flag_url: 'https://flagcdn.com/w80/sn.png' },
  { name: 'South Africa',          code: 'RSA', elo_rating: 1518, confederation: 'CAF',      flag_url: 'https://flagcdn.com/w80/za.png' },
  { name: 'Tunisia',               code: 'TUN', elo_rating: 1633, confederation: 'CAF',      flag_url: 'https://flagcdn.com/w80/tn.png' },
  // ── CONCACAF ───────────────────────────────────────────────────────────────
  { name: 'Canada',                code: 'CAN', elo_rating: 1793, confederation: 'CONCACAF', flag_url: 'https://flagcdn.com/w80/ca.png' },
  { name: 'Mexico',                code: 'MEX', elo_rating: 1875, confederation: 'CONCACAF', flag_url: 'https://flagcdn.com/w80/mx.png' },
  { name: 'United States',         code: 'USA', elo_rating: 1733, confederation: 'CONCACAF', flag_url: 'https://flagcdn.com/w80/us.png' },
  { name: 'Curaçao',               code: 'CUW', elo_rating: 1433, confederation: 'CONCACAF', flag_url: 'https://flagcdn.com/w80/cw.png' },
  { name: 'Haiti',                 code: 'HAI', elo_rating: 1554, confederation: 'CONCACAF', flag_url: 'https://flagcdn.com/w80/ht.png' },
  { name: 'Panama',                code: 'PAN', elo_rating: 1734, confederation: 'CONCACAF', flag_url: 'https://flagcdn.com/w80/pa.png' },
  // ── CONMEBOL (South America) ───────────────────────────────────────────────
  { name: 'Argentina',             code: 'ARG', elo_rating: 2113, confederation: 'CONMEBOL', flag_url: 'https://flagcdn.com/w80/ar.png' },
  { name: 'Brazil',                code: 'BRA', elo_rating: 1988, confederation: 'CONMEBOL', flag_url: 'https://flagcdn.com/w80/br.png' },
  { name: 'Colombia',              code: 'COL', elo_rating: 1977, confederation: 'CONMEBOL', flag_url: 'https://flagcdn.com/w80/co.png' },
  { name: 'Ecuador',               code: 'ECU', elo_rating: 1935, confederation: 'CONMEBOL', flag_url: 'https://flagcdn.com/w80/ec.png' },
  { name: 'Paraguay',              code: 'PAR', elo_rating: 1832, confederation: 'CONMEBOL', flag_url: 'https://flagcdn.com/w80/py.png' },
  { name: 'Uruguay',               code: 'URU', elo_rating: 1892, confederation: 'CONMEBOL', flag_url: 'https://flagcdn.com/w80/uy.png' },
  // ── OFC (Oceania) ──────────────────────────────────────────────────────────
  { name: 'New Zealand',           code: 'NZL', elo_rating: 1563, confederation: 'OFC',      flag_url: 'https://flagcdn.com/w80/nz.png' },
  // ── UEFA (Europe) ──────────────────────────────────────────────────────────
  { name: 'Austria',               code: 'AUT', elo_rating: 1830, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/at.png' },
  { name: 'Belgium',               code: 'BEL', elo_rating: 1888, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/be.png' },
  { name: 'Bosnia and Herzegovina',code: 'BIH', elo_rating: 1591, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/ba.png' },
  { name: 'Croatia',               code: 'CRO', elo_rating: 1908, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/hr.png' },
  { name: 'Czechia',               code: 'CZE', elo_rating: 1740, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/cz.png' },
  { name: 'England',               code: 'ENG', elo_rating: 2020, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/gb-eng.png' },
  { name: 'France',                code: 'FRA', elo_rating: 2062, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/fr.png' },
  { name: 'Germany',               code: 'GER', elo_rating: 1925, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/de.png' },
  { name: 'Netherlands',           code: 'NED', elo_rating: 1944, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/nl.png' },
  { name: 'Norway',                code: 'NOR', elo_rating: 1917, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/no.png' },
  { name: 'Portugal',              code: 'POR', elo_rating: 1984, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/pt.png' },
  { name: 'Scotland',              code: 'SCO', elo_rating: 1770, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/gb-sct.png' },
  { name: 'Spain',                 code: 'ESP', elo_rating: 2155, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/es.png' },
  { name: 'Sweden',                code: 'SWE', elo_rating: 1712, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/se.png' },
  { name: 'Switzerland',           code: 'SUI', elo_rating: 1894, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/ch.png' },
  { name: 'Türkiye',               code: 'TUR', elo_rating: 1906, confederation: 'UEFA',     flag_url: 'https://flagcdn.com/w80/tr.png' },
]

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
    body: JSON.stringify({ query: sql }),
  })
  return { status: res.status, data: await res.json() }
}

// 1. Add confederation column if it doesn't exist
console.log('Adding confederation column…')
await query(`ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS confederation text;`)

// 2. Clear old teams (no matches exist yet)
console.log('Clearing old teams…')
await query('DELETE FROM public.teams;')

// 3. Insert all 48 official teams
console.log(`Inserting ${TEAMS.length} official 2026 WC teams…`)
const values = TEAMS.map(t =>
  `('${t.name.replace(/'/g, "''")}', '${t.code}', ${t.elo_rating}, '${t.confederation}', '${t.flag_url}')`
).join(',\n  ')

const insert = await query(`
  INSERT INTO public.teams (name, code, elo_rating, confederation, flag_url)
  VALUES
  ${values};
`)

if (insert.status === 201) {
  console.log(`✅ All ${TEAMS.length} teams seeded!`)
} else {
  console.error('Insert failed:', JSON.stringify(insert.data, null, 2))
}

// 4. Verify count
const check = await query('SELECT count(*) as total FROM public.teams;')
console.log('Teams in DB:', check.data[0]?.total ?? check.data)
