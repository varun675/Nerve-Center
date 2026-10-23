// Turns observations into progress. Every state is computed for a date, so
// the same code answers "where are we now" and "what changed since then".
import { useMemo } from 'react'
import { PHOTOS, VIDEOS, mediaUrl } from './media'
import INGESTED from './ingested.json'
import { FACADE_OBS, FACADE_STAGES, MILESTONES, PLAN, PROJECT, TRADES, TRADE_OBS, ZONES, tradeById, zoneById } from './aars'
import { useCollection } from '../platform'

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export { fmt as fmtDay }

/** Evidence ref → { ref, type, src, t?, label, date } or null. */
export function resolveRef(ref, captures = []) {
  if (!ref) return null
  if (ref.startsWith('v:')) {
    const [stem, t] = ref.slice(2).split('@')
    const v = VIDEOS.find((x) => x.file.includes('/' + stem + '.'))
    if (!v) return null
    const ch = (v.chapters || []).filter((c) => c.t <= +t).pop()
    return { ref, type: 'video', src: mediaUrl(v.file), t: +t || 0, label: v.title + (ch ? ', ' + ch.label : ''), date: v.date }
  }
  if (ref.startsWith('cap:')) {
    const c = captures.find((x) => x.id === ref.slice(4))
    return c ? { ref, type: 'photo', src: c.src, label: c.spotName || 'Site capture', date: c.date } : null
  }
  const p = PHOTOS.find((x) => x.file === `photos/${ref}.jpg`) || PHOTOS.find((x) => x.id === ref)
  return p ? { ref, type: 'photo', src: mediaUrl(p.file), label: p.note || p.view, date: p.date } : null
}

const STAGE_WORDS = { structure: 0, brick: 1, brickwork: 1, plaster: 2, details: 3, facade: 3, paint: 4, finish: 4 }
/** Parse a caption like "F-GF-L plaster wip" or "ELEC done" into observations. */
export function parseCaption(ref, caption = '') {
  const words = caption.trim().split(/\s+/)
  const status = /\bdone\b|\bcomplete/i.test(caption) ? 'done' : 'prog'
  const out = []
  const stageW = words.map((w) => STAGE_WORDS[w.toLowerCase()]).find((x) => x != null)
  for (const w of words) {
    const z = ZONES.find((x) => x.id === w.toLowerCase())
    if (z && stageW != null) out.push({ ref, zone: z.id, stage: stageW, status })
    const tr = TRADES.find((x) => x.id === w.toLowerCase())
    if (tr && !z) out.push({ ref, trade: tr.id, status })
  }
  return out
}
const INGESTED_OBS = INGESTED.flatMap((m) => parseCaption(m.id, m.caption))

/** Everything the progress views need, live. */
export function useProgress() {
  const [confirmed] = useCollection('observations')
  const [captures] = useCollection('captures')
  const [planEdits] = useCollection('plan')

  return useMemo(() => {
    const extra = confirmed.filter((o) => !o.rejected)
    const dateOf = (o) => o.date || resolveRef(o.ref, captures)?.date || PROJECT.today
    const facadeObs = [...FACADE_OBS, ...INGESTED_OBS.filter((o) => o.zone), ...extra.filter((o) => o.zone)].map((o) => ({ ...o, date: dateOf(o) }))
    const tradeObs = [...TRADE_OBS, ...INGESTED_OBS.filter((o) => o.trade), ...extra.filter((o) => o.trade)].map((o) => ({ ...o, date: dateOf(o) }))
    const plan = { ...PLAN }
    for (const p of planEdits) if (p.start && p.finish) plan[p.id.replace('~', ':')] = [p.start, p.finish]

    const zoneState = (id, at = PROJECT.today) => {
      const ev = facadeObs.filter((o) => o.zone === id && o.date <= at)
      let done = 0
      for (const o of ev) if (o.status === 'done') done = Math.max(done, o.stage + 1)
      let active = null
      for (const o of ev) if (o.status === 'prog' && o.stage >= done) active = Math.max(active ?? -1, o.stage)
      if (!ev.length) return { key: 'none', done: 0, active: null, pct: 0, text: 'No evidence yet', ev }
      const pct = Math.round(((done + (active != null ? 0.5 : 0)) / FACADE_STAGES.length) * 100)
      const text = active != null ? FACADE_STAGES[active] + ' in progress' : FACADE_STAGES[done - 1] + ' complete'
      return { key: active != null ? 'prog' : 'done', done, active, pct, text, ev }
    }
    const tradeState = (id, at = PROJECT.today) => {
      const ev = tradeObs.filter((o) => o.trade === id && o.date <= at)
      const status = ev.some((o) => o.status === 'done') ? 'done' : ev.length ? 'prog' : 'todo'
      return { status, ev }
    }
    /** Status of a plan item ('facade:2' or 'trade:elec'): done | prog | todo, plus what blocks it. */
    const itemState = (key, at = PROJECT.today) => {
      const [kind, id] = key.split(':')
      if (kind === 'trade') { const s = tradeState(id, at); return { status: s.status, missing: s.status === 'done' ? [] : [tradeById(id).name] } }
      const i = +id
      const zs = ZONES.map((z) => ({ z, s: zoneState(z.id, at) }))
      const missing = zs.filter(({ s }) => s.done <= i).map(({ z }) => `${z.name} (${z.side})`)
      const any = zs.some(({ s }) => s.done > i || s.active === i)
      return { status: missing.length === 0 ? 'done' : any ? 'prog' : 'todo', missing }
    }
    const itemName = (key) => {
      const [k, id] = key.split(':')
      if (k === 'trade') return tradeById(id).name
      const s = FACADE_STAGES[+id]
      return s.startsWith('Facade') ? s : 'Facade ' + s.toLowerCase()
    }
    /** Why an item is not done, in words. */
    const why = (key, s) => {
      if (key.startsWith('trade')) return s.status === 'prog' ? 'still in progress' : 'no evidence of work yet'
      const noEv = ZONES.filter((z) => !zoneState(z.id).ev.length).length
      const open = s.missing.length
      if (open === noEv) return `${open} of ${ZONES.length} zones have no photo yet`
      return `${open} of ${ZONES.length} zones not yet shown complete` + (noEv ? `, ${noEv} with no photo at all` : '')
    }

    const facadePct = (at) => Math.round(ZONES.reduce((a, z) => a + zoneState(z.id, at).pct, 0) / ZONES.length)
    const interiorPct = (at) => Math.round((TRADES.reduce((a, t) => a + ({ done: 1, prog: 0.5, todo: 0 })[tradeState(t.id, at).status], 0) / TRADES.length) * 100)

    /** Plan items that should be finished or started by `at` but aren't. */
    const warnings = (at = PROJECT.today) => Object.entries(plan).flatMap(([key, [start, finish]]) => {
      const s = itemState(key, at)
      if (s.status !== 'done' && finish < at) return [{ key, level: 'bad', name: itemName(key), text: `Planned to finish ${fmt(finish)}; ${why(key, s)}.`, days: Math.round((new Date(at) - new Date(finish)) / 864e5), missing: s.missing }]
      if (s.status === 'todo' && start < at) return [{ key, level: 'warn', name: itemName(key), text: `Planned to start ${fmt(start)}; no photo or video shows it yet.`, days: Math.round((new Date(at) - new Date(start)) / 864e5), missing: s.missing }]
      return []
    }).sort((a, b) => (a.level === b.level ? b.days - a.days : a.level === 'bad' ? -1 : 1))

    const milestoneState = (m, at = PROJECT.today) => {
      const parts = m.needs.map((k) => ({ key: k, name: itemName(k), ...itemState(k, at) }))
      return { met: parts.every((p) => p.status === 'done'), parts }
    }

    const evidenceDates = [...new Set([...facadeObs, ...tradeObs].map((o) => o.date))].sort()

    return { zoneState, tradeState, itemState, itemName, facadePct, interiorPct, warnings, milestoneState, plan, evidenceDates, captures, resolve: (r) => resolveRef(r, captures), zoneById, MILESTONES }
  }, [confirmed, captures, planEdits])
}
