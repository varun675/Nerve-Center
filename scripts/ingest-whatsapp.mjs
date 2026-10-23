// Import site photos and videos from a WhatsApp chat export.
//
//   npm run ingest -- "C:/path/to/WhatsApp Chat with AARS Site"          (import)
//   npm run ingest -- "C:/path/to/WhatsApp Chat with AARS Site" --dry-run (show what would happen)
//
// In WhatsApp: open the site group → More → Export chat → Include media, and
// unzip it. The export keeps each message's send time, so photos get a real
// date even though WhatsApp strips it from the image itself. A caption such as
// "F-GF-L plaster wip" or "ELEC done" tags the photo (codes in src/data/aars.js).
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const [dir, flag] = process.argv.slice(2)
const dry = flag === '--dry-run'
if (!dir || !existsSync(dir)) {
  console.error('Give the unzipped WhatsApp export folder: npm run ingest -- "<folder>"')
  process.exit(1)
}
const chatFile = readdirSync(dir).find((f) => /\.txt$/i.test(f))
if (!chatFile) { console.error('No chat .txt file in ' + dir); process.exit(1) }

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const OUT_DIR = join(ROOT, 'public/media/whatsapp')
const MANIFEST = join(ROOT, 'src/data/ingested.json')
const IMG = /\.(jpe?g|png|webp)$/i, VID = /\.(mp4|mov|3gp)$/i
const TRADE_VIEW = { STRUCT: 'Structure', BRICK: 'Masonry', DRAIN: 'Drainage and plumbing', ELEC: 'Electrical', PLASTER: 'Plaster', HVAC: 'HVAC', DOORS: 'Doors and frames', CEILING: 'False ceiling', FLOOR: 'Flooring', PAINT: 'Painting' }

// A message starts with a date: Android "17/09/2026, 2:52 pm - Name: …",
// iOS "[17/09/26, 2:52:50 PM] Name: …".
const START = /^\[?(\d{1,2})[/.](\d{1,2})[/.](\d{2,4}),? (\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?\]?\s*[-–]?\s*([^:]+):\s?(.*)$/i
const lines = readFileSync(join(dir, chatFile), 'utf8').replace(/\u200e|\u200f/g, '').split(/\r?\n/)
const msgs = []
for (const line of lines) {
  const m = line.match(START)
  if (m) {
    let [, d, mo, y, h, mi, ap, who, body] = m
    y = y.length === 2 ? '20' + y : y
    h = +h; if (ap && /p/i.test(ap) && h < 12) h += 12; if (ap && /a/i.test(ap) && h === 12) h = 0
    msgs.push({ date: `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`, time: `${String(h).padStart(2, '0')}:${mi}`, who: who.trim(), body })
  } else if (msgs.length) msgs[msgs.length - 1].body += '\n' + line
}

const files = new Set(readdirSync(dir))
const existing = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : []
const seen = new Set(existing.map((x) => x.id))
const added = [], skipped = []
for (const m of msgs) {
  const names = [...m.body.matchAll(/([\w\-. ]+?\.(?:jpe?g|png|webp|heic|mp4|mov|3gp))/gi)].map((x) => x[1].trim()).filter((n) => files.has(n))
  if (!names.length) continue
  const caption = m.body.replace(/<attached:[^>]*>/gi, '').replace(/\(file attached\)/gi, '').replace(/[\w\-. ]+?\.(?:jpe?g|png|webp|heic|mp4|mov|3gp)/gi, '').replace(/\s+/g, ' ').trim()
  for (const name of names) {
    if (/\.heic$/i.test(name)) { skipped.push(`${name}: HEIC does not show in browsers; set the phone camera to "Most compatible" (JPEG)`); continue }
    const bytes = readFileSync(join(dir, name))
    const id = 'wa-' + createHash('sha1').update(bytes).digest('hex').slice(0, 10)
    if (seen.has(id)) { skipped.push(`${name}: already imported`); continue }
    seen.add(id)
    const type = IMG.test(name) ? 'photo' : VID.test(name) ? 'video' : null
    if (!type) continue
    const ext = type === 'video' ? '.mp4' : extname(name).toLowerCase().replace('.jpeg', '.jpg')
    const file = `whatsapp/${m.date}_${id}${ext}`
    const trade = caption.split(/\s+/).map((w) => w.toUpperCase()).find((w) => TRADE_VIEW[w])
    const zone = /\b[FBR]-[A-Z-]+\b/i.test(caption)
    added.push({ id, type, file, date: m.date, time: m.time, caption, view: trade ? TRADE_VIEW[trade] : zone ? 'Exterior' : 'From WhatsApp', src: name })
  }
}

console.log(`${chatFile}: ${msgs.length} messages, ${added.length} new media, ${skipped.length} skipped`)
for (const a of added) console.log(`  + ${a.date} ${a.time}  ${a.type.padEnd(5)} ${a.src} → ${a.file}${a.caption ? '  "' + a.caption + '"' : ''}`)
for (const s of skipped) console.log('  - ' + s)
if (dry) { console.log('Dry run: nothing copied.'); process.exit(0) }

mkdirSync(OUT_DIR, { recursive: true })
for (const a of added) copyFileSync(join(dir, a.src), join(ROOT, 'public/media', a.file))
writeFileSync(MANIFEST, JSON.stringify([...existing, ...added.map(({ src, ...rest }) => rest)], null, 2) + '\n')
console.log(`Done. ${added.length} files in public/media/whatsapp, listed in src/data/ingested.json.`)
