import { useState } from 'react'
import { MILESTONES } from '../data/aars'
import { useProgress } from '../data/progress'
import { useActor, useCollection, useNames } from '../platform'
import { useStore } from '../state/store.jsx'
import { Kpi } from '../components/ui.jsx'

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
const STATUS = { none: ['Not requested', 'idle'], requested: ['Waiting for approval', 'watch'], approved: ['Approved for payment', 'ok'], rejected: ['Rejected', 'bad'], paid: ['Paid', 'ok'] }

export default function Payments() {
  const P = useProgress()
  const actor = useActor()
  const { dispatch } = useStore()
  const [pays, api] = useCollection('payments')
  const [settings, setApi] = useCollection('settings')
  const contract = +(settings.find((s) => s.id === 'contract')?.value || 0)
  const [cv, setCv] = useState('')
  const [note, setNote] = useState({})
  const names = useNames(pays.flatMap((p) => (p.log || []).map((l) => l.by)))

  const rows = MILESTONES.map((m) => ({ m, ev: P.milestoneState(m), pay: pays.find((p) => p.id === m.id) || { status: 'none', log: [] } }))
  const sum = (f) => rows.filter(f).reduce((a, r) => a + r.m.pct, 0)

  const act = async (r, status, text) => {
    if (status === 'rejected' && !text) return dispatch({ type: 'toast', msg: 'Add a reason so the requester knows what to fix.', bad: true })
    const entry = { status, by: actor.id, at: new Date().toISOString(), note: text || '' }
    const next = { status, requestedBy: status === 'requested' ? actor.id : r.pay.requestedBy || null, log: [...(r.pay.log || []), entry] }
    try {
      await api.set(r.m.id, next)
      setNote({ ...note, [r.m.id]: '' })
      dispatch({ type: 'toast', msg: { requested: 'Release requested. An approver needs to confirm.', approved: 'Approved for payment.', rejected: 'Request rejected.', paid: 'Marked as paid.' }[status] })
    } catch (e) {
      dispatch({ type: 'toast', msg: `Couldn't save (${e.code || e.message}).`, bad: true })
    }
  }

  return (
    <>
      <h2>Payments against evidence</h2>
      <p className="lede">Each contractor milestone is tied to stages of work. A release can be requested only when dated photos show those stages complete, and a second person with approval rights has to approve it. Every step is kept in the milestone's history.</p>
      <div className="kpis">
        <Kpi v={sum((r) => r.pay.status === 'paid') + '%'} small={contract ? inr((contract * sum((r) => r.pay.status === 'paid')) / 100) : ''} k="Paid" />
        <Kpi v={sum((r) => r.pay.status === 'approved' || r.pay.status === 'requested') + '%'} k="Requested or approved, not yet paid" />
        <Kpi v={sum((r) => r.ev.met) + '%'} k="Earned on evidence" color="var(--ok)" />
        <Kpi v={sum((r) => r.pay.status === 'paid' && !r.ev.met) + '%'} k="Paid ahead of evidence" color="var(--bad)" />
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="tools" style={{ marginBottom: 0 }}>
          <b>Contract value</b>
          <span>{contract ? inr(contract) : 'Not set, so amounts show as percentages only'}</span>
          {actor.canApprove && (
            <form className="tools" style={{ marginBottom: 0 }} onSubmit={(e) => { e.preventDefault(); const v = Math.round(+cv.replace(/[^\d.]/g, '')); if (v > 0) setApi.set('contract', { value: v, by: actor.id }).then(() => { setCv(''); dispatch({ type: 'toast', msg: 'Contract value saved.' }) }) }}>
              <input id="contract-value" className="sel" inputMode="numeric" placeholder="e.g. 18500000" value={cv} onChange={(e) => setCv(e.target.value)} aria-label="Contract value in rupees" />
              <button className="btn">Set</button>
            </form>
          )}
        </div>
      </div>

      <div className="paylist">
        {rows.map((r) => {
          const st = STATUS[r.pay.status]
          const mine = r.pay.requestedBy === actor.id
          return (
            <article key={r.m.id} className="panel pay">
              <div className="pay-h">
                <div><b>{r.m.name}</b><div className="empty">{r.m.pct}% of contract{contract ? ' · ' + inr((contract * r.m.pct) / 100) : ''}</div></div>
                <div className="snag-meta" style={{ margin: 0 }}>
                  <span className={'pill ' + (r.ev.met ? 'ok' : 'idle')}>{r.ev.met ? 'Evidence complete' : 'Evidence incomplete'}</span>
                  <span className={'pill ' + st[1]}>{st[0]}</span>
                </div>
              </div>
              <ul className="checks">
                {r.ev.parts.map((p) => (
                  <li key={p.key} className={p.status}>
                    <i />{p.name}<small>{p.status === 'done' ? 'Complete' : p.status === 'prog' ? 'In progress' : 'No evidence yet'}</small>
                    {p.status !== 'done' && p.missing.length > 0 && p.key.startsWith('facade') && <em>Still open: {p.missing.slice(0, 4).join(', ')}{p.missing.length > 4 ? ` and ${p.missing.length - 4} more` : ''}</em>}
                  </li>
                ))}
              </ul>
              {(r.pay.log || []).length > 0 && (
                <ol className="log">
                  {r.pay.log.map((l, i) => <li key={i}><b>{STATUS[l.status][0]}</b> by {names[l.by] || 'Someone'}, {new Date(l.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{l.note ? `: "${l.note}"` : ''}</li>)}
                </ol>
              )}
              <div className="tools" style={{ marginTop: 10, marginBottom: 0 }}>
                {(r.pay.status === 'none' || r.pay.status === 'rejected') && (
                  <button className="btn primary" disabled={!r.ev.met} title={r.ev.met ? '' : 'Needs photo evidence that every stage above is complete'} onClick={() => act(r, 'requested')}>Request release</button>
                )}
                {r.pay.status === 'requested' && (actor.canApprove && !mine ? <>
                  <input id={'note-' + r.m.id} className="sel" placeholder="Comment (needed to reject)" value={note[r.m.id] || ''} onChange={(e) => setNote({ ...note, [r.m.id]: e.target.value })} />
                  <button className="btn primary" onClick={() => act(r, 'approved', note[r.m.id])}>Approve</button>
                  <button className="btn" onClick={() => act(r, 'rejected', note[r.m.id])}>Reject</button>
                </> : <span className="empty">{mine ? 'You requested this. Another approver has to decide.' : 'Waiting for a project manager or admin.'}</span>)}
                {r.pay.status === 'approved' && actor.canApprove && <button className="btn" onClick={() => act(r, 'paid')}>Mark as paid</button>}
                {!r.ev.met && r.pay.status === 'none' && <span className="empty">Unlocks when the photos show every stage above complete.</span>}
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
