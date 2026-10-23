import { createContext, useContext, useMemo, useReducer } from 'react'
import { currentVal, fieldName, fmtD, label, stamp } from '../data/model'
import { U, USERS, approvers, can } from '../data/users'
import { DEVICES } from '../data/devices'

/* ------------------------------------------------------------------
   Global state. Every manual change goes through submit → decide,
   and both steps write to the audit trail and send an email.
------------------------------------------------------------------- */

const initial = {
  tab: window.location.hash.slice(1) || new URLSearchParams(window.location.search).get('tab') || 'home', // #photos or ?tab=photos opens a tab
  W: 6,
  meId: 'rahul',
  clock: 0,
  crSeq: 1040,
  overrides: {},     // key|week -> { obs, by, cr, sub, appr }
  repOverrides: {},  // key|week -> { val, cr, sub, appr }
  reviewed: {},      // key|week -> 'accepted' | { submitted: value }
  actions: {},       // key -> agreed recovery action
  fixState: {},      // key|sprint -> Open | In progress | Closed
  changes: [],
  audit: [],
  mails: [],
  selMail: null,
  devices: DEVICES.map((d) => ({ ...d })),
  feed: [],
  pipe: { in: 18466, ok: 18390, ai: 2345, rec: 24 },
  toast: null,
  dialog: null,
  correction: null,  // prefill for the manual change form
}

const tick = (st) => ({ ...st, clock: st.clock + 1 })
const now = (st) => { const d = stamp(st.W, 5, 17, 0); d.setMinutes(d.getMinutes() + st.clock * 3); return d }
const toast = (st, msg, bad = false) => ({ ...st, toast: { msg, bad, id: Date.now() + Math.random() } })

function logA(st, entry) {
  st = tick(st)
  return { ...st, audit: [{ at: now(st), ...entry }, ...st.audit] }
}
function mail(st, to, cc, subject, body) {
  st = tick(st)
  const m = { id: st.mails.length + 1, at: now(st), to, cc, subject, body }
  return { ...st, mails: [m, ...st.mails], selMail: m.id }
}

function submit(st, p, silent) {
  st = tick(st)
  const s = U(p.by)
  const old = currentVal(st, p.f, p.pid, p.week, p.field)
  const cr = { ...p, id: 'CR-' + (st.crSeq + 1), status: 'Pending', at: now(st), old }
  st = { ...st, crSeq: st.crSeq + 1, changes: [cr, ...st.changes] }
  st = logA(st, { who: p.by, action: 'Submitted manual update', item: `${label(p.f, p.pid)}, week ${p.week}`, chg: `${fieldName(p.field)} ${old}% → ${p.val}%`, status: 'Submitted', cr: cr.id })
  const appr = approvers(p.by)
  st = mail(st, appr.map((u) => u.email), [s.email],
    `[Approval needed] ${cr.id}: manual update to ${label(p.f, p.pid)}`,
    `${s.name} (${s.role}) has submitted a manual change that needs your approval.\n\nItem: ${label(p.f, p.pid)}, Tower B, week ${p.week}\nFigure: ${fieldName(p.field)}\nDevice value: ${old}%\nRequested value: ${p.val}%\nReason: ${p.why}${p.file ? '\nAttachment: ' + p.file : ''}\n\nThe value shown on dashboards stays at ${old}% until the change is approved.\nReview it under Manual changes.`)
  return silent ? st : toast(st, `${cr.id} sent for approval. Email sent to ${appr.map((u) => u.name).join(' and ')}.`)
}

function decide(st, { id, ok, comment, by }, silent) {
  const me = U(by)
  const cr = st.changes.find((c) => c.id === id)
  if (!cr || cr.status !== 'Pending') return st
  if (!can(me, 'approve')) return toast(st, 'Your role can’t approve changes.', true)
  if (cr.by === by) return toast(st, 'You can’t approve your own change. Another manager or admin has to review it.', true)
  if (!ok && !comment) return toast(st, 'Add a comment so the submitter knows why it was rejected.', true)
  st = tick(st)
  const done = { ...cr, status: ok ? 'Approved' : 'Rejected', decidedBy: by, comment: comment || '', decidedAt: now(st) }
  st = { ...st, changes: st.changes.map((c) => (c.id === id ? done : c)) }
  const s = U(cr.by)
  if (ok) {
    const k = cr.key + '|' + cr.week
    if (cr.field === 'obs') st = { ...st, overrides: { ...st.overrides, [k]: { obs: cr.val, by: 'manual', cr: cr.id, sub: s.name, appr: me.name } } }
    else st = { ...st, repOverrides: { ...st.repOverrides, [k]: { val: cr.val, cr: cr.id, sub: s.name, appr: me.name } } }
  }
  st = logA(st, { who: by, action: ok ? 'Approved manual update' : 'Rejected manual update', item: `${label(cr.f, cr.pid)}, week ${cr.week}`, chg: `${fieldName(cr.field)} ${cr.old}% → ${cr.val}%`, status: ok ? 'Applied' : 'Not applied', cr: cr.id })
  const others = USERS.map((u) => u.email).filter((e) => e !== s.email)
  st = ok
    ? mail(st, [s.email], others,
      `Data modified manually: ${label(cr.f, cr.pid)} ${fieldName(cr.field)} ${cr.old}% → ${cr.val}%`,
      `A manual change has been approved and applied.\n\nItem: ${label(cr.f, cr.pid)}, Tower B, week ${cr.week}\nFigure: ${fieldName(cr.field)}\nChanged from ${cr.old}% (device value) to ${cr.val}%\nSubmitted by: ${s.name}, ${fmtD(cr.at)}\nApproved by: ${me.name}, ${fmtD(done.decidedAt)}\nReason: ${cr.why}${comment ? '\nApprover comment: ' + comment : ''}\n\nThe dashboard now marks this figure as manually changed. The original device value is kept in the audit trail (${cr.id}).`)
    : mail(st, [s.email], others,
      `Manual update rejected: ${cr.id}, ${label(cr.f, cr.pid)}`,
      `${me.name} rejected your manual change ${cr.id}.\n\nItem: ${label(cr.f, cr.pid)}, week ${cr.week}\nRequested: ${fieldName(cr.field)} ${cr.old}% → ${cr.val}%\nComment: ${comment}\n\nThe device value of ${cr.old}% remains in place.`)
  if (silent) return st
  return toast(st, ok ? `${cr.id} approved and applied. Notification emailed to the team.` : `${cr.id} rejected. ${s.name} has been notified by email.`)
}

function reducer(st, a) {
  const me = U(st.meId)
  switch (a.type) {
    case 'tab': return { ...st, tab: a.tab }
    case 'week': return { ...st, W: a.W }
    case 'user': return toast({ ...st, meId: a.id }, `Now signed in as ${U(a.id).name} (${U(a.id).role}).`)
    case 'toast': return toast(st, a.msg, a.bad)
    case 'clearToast': return st.toast && st.toast.id === a.id ? { ...st, toast: null } : st
    case 'dialog': return { ...st, dialog: a.dialog }
    case 'selMail': return { ...st, selMail: a.id }
    case 'submit': {
      if (!can(me, 'submit', a.payload.f)) return toast(st, `Your role or floor scope doesn't allow changes to floor ${a.payload.f}.`, true)
      st = submit(st, { ...a.payload, by: me.id })
      return a.reviewKey ? { ...st, reviewed: { ...st.reviewed, [a.reviewKey]: { submitted: a.payload.val } } } : st
    }
    case 'decide': return decide(st, { ...a.payload, by: me.id })
    case 'confirm': {
      if (!can(me, 'confirm')) return toast(st, 'Your role can’t confirm detections.', true)
      const [f, pid] = a.key.split('-')
      st = logA(st, { who: me.id, action: 'Confirmed AI detection', item: `${label(f, pid)}, week ${st.W}`, chg: 'No change to value', status: 'Confirmed' })
      const k = a.key + '|' + st.W
      return { ...st, reviewed: { ...st.reviewed, [k]: 'accepted' }, overrides: { ...st.overrides, [k]: { obs: a.obs, by: 'accepted' } } }
    }
    case 'action': return { ...st, actions: { ...st.actions, [a.key]: a.text } }
    case 'clearAction': { const x = { ...st.actions }; delete x[a.key]; return { ...st, actions: x } }
    case 'fix': return { ...st, fixState: { ...st.fixState, [a.key]: a.value } }
    case 'correction': return { ...st, tab: 'changes', dialog: null, correction: { ...a.prefill, n: Date.now() } }
    case 'restart': {
      if (!can(me, 'devices')) return toast(st, 'Only admins can manage devices.', true)
      st = logA(st, { who: me.id, action: 'Reconnected device', item: a.id, chg: 'Offline → online', status: 'Done' })
      return { ...st, devices: st.devices.map((d) => (d.id === a.id ? { ...d, st: 'sync' } : d)) }
    }
    case 'online': return toast({ ...st, devices: st.devices.map((d) => (d.id === a.id ? { ...d, st: 'on', why: '' } : d)) }, `${a.id} is back online.`)
    case 'feed': {
      const e = a.event
      const dev = st.devices.find((d) => d.id === e.dev)
      if (!dev || dev.st !== 'on') return st
      return {
        ...st,
        devices: st.devices.map((d) => (d.id === e.dev ? { ...d, n: d.n + 1 } : d)),
        pipe: { in: st.pipe.in + 1, ok: st.pipe.ok + 1, ai: st.pipe.ai + (e.ai ? 1 : 0), rec: st.pipe.rec + (e.reconciled ? 1 : 0) },
        feed: [e, ...st.feed].slice(0, 40),
      }
    }
    default: return st
  }
}

// Seed a realistic history: one approved change, one rejected change,
// one change waiting for approval, and a device alert.
function seed() {
  let st = { ...initial, W: 5 }
  const o8 = currentVal(st, 8, 'block', 5, 'obs')
  st = submit(st, { key: '8-block', f: 8, pid: 'block', week: 5, field: 'obs', val: Math.min(100, o8 + 10), why: 'The 360° walk skipped the stair core. Courses there were finished on Friday, see photo.', file: 'F8_stair_core.jpg', by: 'sk' }, true)
  st = decide(st, { id: st.changes[0].id, ok: true, comment: 'Checked on site, agreed.', by: 'rahul' }, true)
  st = submit(st, { key: '6-mep', f: 6, pid: 'mep', week: 5, field: 'rep', val: 100, why: 'Contractor says all conduit runs on F6 are finished.', by: 'rahul' }, true)
  st = decide(st, { id: st.changes[0].id, ok: false, comment: 'Captures only show about 30%. Please re-check at the next walkthrough.', by: 'priya' }, true)
  st = { ...st, W: 6 }
  st = submit(st, { key: '7-block', f: 7, pid: 'block', week: 6, field: 'obs', val: 85, why: 'Friday’s walkthrough missed the east wall. Courses 8 to 10 were finished on Saturday.', file: 'F7_east_wall_sat.jpg', by: 'sk' }, true)
  st = logA(st, { who: 'system', action: 'Device went offline', item: 'DRN-01 survey drone', chg: 'Grounded, wind above limit', status: 'Open' })
  return { ...st, toast: null }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [st, dispatch] = useReducer(reducer, undefined, seed)
  const value = useMemo(() => {
    const me = U(st.meId)
    return { st, dispatch, me, can: (perm, floor) => can(me, perm, floor) }
  }, [st])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
