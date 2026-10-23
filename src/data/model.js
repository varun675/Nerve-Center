// project model for Tower B (floors 3–8). All values are generated
// deterministically so the AARC behaves the same every time.

export const PKGS = [
  { id: 'slab', name: 'Slab casting', off: 0, dur: 1 },
  { id: 'block', name: 'Blockwork', off: 1.5, dur: 2.5 },
  { id: 'mep', name: 'MEP rough-in', off: 2, dur: 2.5 },
  { id: 'plaster', name: 'Plastering', off: 3.5, dur: 2.5 },
]
export const FLOORS = [8, 7, 6, 5, 4, 3]
export const LAG = { '7-block': 0.6, '6-mep': 0.8, '5-plaster': 0.5, '8-slab': 0.3, '4-mep': 0.3 }
export const OPTIMISTIC = new Set(['7-block', '6-mep', '5-plaster'])
export const SUCC = { block: 'plaster', mep: 'plaster' }
export const ENGINEERS = { 8: 'R. Iyer', 7: 'S. Kulkarni', 6: 'A. Shaikh', 5: 'P. Nair', 4: 'M. Desai', 3: 'V. Rao' }
export const BASE = new Date(2026, 5, 1) // week 1 starts 1 Jun 2026 (sample)
export const MINW = 1
export const MAXW = 8
export const statusText = { ok: 'On track', watch: 'Slipping', behind: 'Behind', idle: 'Not started' }

export function h(s) {
  let x = 2166136261
  for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) }
  return Math.abs(x)
}
const clamp = (v) => Math.max(0, Math.min(1, v))
const r5 = (v) => Math.round(v / 5) * 5
export const pkg = (id) => PKGS.find((p) => p.id === id)
export const label = (f, pid) => `F${f} ${pkg(pid).name}`
export const fieldName = (x) => (x === 'obs' ? 'observed progress' : 'contractor-reported progress')

/** One floor × work package for a given week, including approved manual overrides. */
export function cellFor(st, f, p, w) {
  const key = f + '-' + p.id
  const s = (f - 3) * 0.5 + p.off
  const lag = LAG[key] || 0
  const planned = Math.round(clamp((w - s) / p.dur) * 100)
  let obs = Math.round(clamp((w - s - lag) / p.dur) * 100)
  const ov = st.overrides[key + '|' + w]
  if (ov) obs = ov.obs
  const rov = st.repOverrides[key + '|' + w]
  const reported = rov ? rov.val : OPTIMISTIC.has(key) ? r5(Math.max(obs, planned)) : r5(obs)
  let conf = 0.74 + (h(key + w) % 24) / 100
  if (obs === 0 || obs === 100) conf = Math.min(0.98, conf + 0.06)
  if (ov) conf = 1
  const manual = (ov && ov.by === 'manual') || !!rov
  let fresh = h('f' + key + w) % 60
  if (key === '8-mep') fresh = 96 + (h(key) % 30)
  const variance = obs - planned
  const started = planned > 0 || obs > 0
  let status = 'idle'
  if (started) status = variance <= -15 ? 'behind' : variance <= -5 ? 'watch' : 'ok'
  const gap = reported - obs
  return {
    key, manual, ov, rov, f, p, s, lag, planned, obs, reported, conf, fresh, variance, started, status, gap,
    flagged: started && gap >= 10,
    needsReview: started && obs > 0 && obs < 100 && conf < 0.82 && !ov,
    planFinish: s + p.dur,
    fcFinish: s + p.dur + lag,
  }
}
export const cellByKey = (st, key, w) => { const [f, pid] = key.split('-'); return cellFor(st, +f, pkg(pid), w) }
export function allCells(st, w) {
  const out = []
  FLOORS.forEach((f) => PKGS.forEach((p) => out.push(cellFor(st, f, p, w))))
  return out
}
export const currentVal = (st, f, pid, w, field) => { const c = cellFor(st, +f, pkg(pid), w); return field === 'obs' ? c.obs : c.reported }

export function weekDates(w) {
  const a = new Date(BASE); a.setDate(a.getDate() + (w - 1) * 7)
  const b = new Date(a); b.setDate(b.getDate() + 6)
  const o = { day: 'numeric', month: 'short' }
  return a.toLocaleDateString('en-GB', o) + ' to ' + b.toLocaleDateString('en-GB', o) + ' 2026'
}
export function stamp(week, day, hh, mm) {
  const d = new Date(BASE); d.setDate(d.getDate() + (week - 1) * 7 + day); d.setHours(hh, mm, 0, 0); return d
}
export function capTime(c, W) {
  const t = new Date(stamp(W, 5, 17, 30).getTime() - c.fresh * 3600e3)
  return t.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
export const fmtD = (d) => d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export const avg = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0)
