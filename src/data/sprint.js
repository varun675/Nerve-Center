import { FLOORS, PKGS, cellFor, h, weekDates } from './model'

export const SPRINTS = [1, 2, 3, 4].map((n) => ({ n, start: 2 * n - 1, end: 2 * n }))
export const CREW = { slab: 20, block: 16, mep: 10, plaster: 12 }

export const CAUSES = {
  '7-block': { cat: 'Labour shortfall', why: 'Two mason gangs were moved to another tower. Image analysis counted far fewer workers on F7 than the crew plan.', fix: ['Bring back two mason gangs from Monday', 'Add a Sunday shift until the gap closes', 'Check crew count daily from the 360° captures'], owner: 'S. Kulkarni', short: 0.38 },
  '6-mep': { cat: 'Material delay', why: 'Conduits and junction boxes arrived six days after the need date. Captures show conduit runs stopping partway along the wall.', fix: ['Expedite the balance order with the vendor', 'Keep two weeks of buffer stock for MEP consumables', 'Move the F6 electricians to F7 preparation until material arrives'], owner: 'A. Shaikh', short: 0.12 },
  '5-plaster': { cat: 'Predecessor not released', why: 'MEP chasing on two F5 walls was not signed off, so plastering could not start there. Captures show those walls still bare.', fix: ['Close the MEP sign-off on the two F5 walls', 'Send the plaster crew to released walls first', 'Add a sign-off check before any plaster task starts'], owner: 'P. Nair', short: 0.1 },
  '8-slab': { cat: 'Weather', why: 'Rain stopped the pour for two days, and the drone flight on the same days was cancelled.', fix: ['Reschedule the pour with a covered-pour plan', 'Use handheld capture when the drone cannot fly'], owner: 'R. Iyer', short: 0.05 },
  '4-mep': { cat: 'Design change', why: 'A revised electrical layout arrived mid-sprint through an RFI and paused two conduit runs.', fix: ['Close the RFI with the electrical consultant', 'Issue the updated drawings on site', 'Restart the paused runs'], owner: 'M. Desai', short: 0.08 },
  stale: { cat: 'No recent evidence', why: 'No capture in the last 72 hours, so progress cannot be confirmed.', fix: ['Schedule a handheld 360° walkthrough', 'Add this floor to the next drone flight'], owner: 'Site survey team', short: 0 },
}

export const CAUSE_COL = {
  'Labour shortfall': 'var(--bad)',
  'Material delay': 'var(--warn)',
  'Predecessor not released': '#8B5CF6',
  Weather: '#0EA5E9',
  'Design change': '#DB2777',
  'No recent evidence': 'var(--muted)',
}

export const sprintDates = (s) => weekDates(s.start).split(' to ')[0] + ' to ' + weekDates(s.end).split(' to ')[1]

export function sprintTasks(st, s) {
  const out = []
  FLOORS.forEach((f) => PKGS.forEach((p) => {
    const a = cellFor(st, f, p, s.start - 1)
    const b = cellFor(st, f, p, s.end)
    if (b.planned - a.planned <= 0) return
    const plan = Math.max(1, b.planned - a.obs) // work needed this sprint to reach target
    const done = Math.max(0, b.obs - a.obs)
    const pct = Math.min(100, Math.round((done / plan) * 100))
    let cause = null
    let status
    if (b.fresh > 72 && b.obs < 100) { status = 'Unverified'; cause = 'stale' }
    else if (b.obs >= b.planned) status = 'Done'
    else if (done === 0) status = 'Not started'
    else status = 'Partly done'
    if (status !== 'Done' && !cause) cause = CAUSES[b.key] ? b.key : null
    const crewPlan = CREW[p.id]
    const short = cause && CAUSES[cause] ? CAUSES[cause].short : 0
    const crewSeen = Math.round(crewPlan * (1 - short) * (0.93 + (h(b.key + s.n) % 8) / 100))
    out.push({ key: b.key, f, p, a, b, plan, done, pct, status, cause, crewPlan, crewSeen, lost: Math.max(0, plan - done) })
  }))
  return out
}
