import { useEffect, useRef, useState } from 'react'
import { FLOORS, PKGS, currentVal, fieldName, fmtD, label } from '../data/model'
import { U } from '../data/users'
import { useStore } from '../state/store.jsx'
import { Pill } from '../components/ui.jsx'

const STATUS_PILL = { Submitted: 'watch', Applied: 'ok', 'Not applied': 'bad', Done: 'ok', Open: 'bad', Confirmed: 'ok' }

function SubmitForm() {
  const { st, dispatch, me, can } = useStore()
  const inScope = (f) => !me.scope || me.scope.includes(f)
  const [f, setF] = useState(me.scope ? me.scope[0] : 7)
  const [pid, setPid] = useState('block')
  const [field, setField] = useState('obs')
  const [val, setVal] = useState('')
  const [why, setWhy] = useState('')
  const [err, setErr] = useState('')
  const fileRef = useRef(null)
  const valRef = useRef(null)

  // Keep the floor inside the signed-in user's scope
  useEffect(() => { if (!inScope(f)) setF(me.scope[0]) }, [me.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prefill from "Request a correction"
  useEffect(() => {
    if (!st.correction) return
    setF(st.correction.f); setPid(st.correction.pid); setField('obs')
    setTimeout(() => valRef.current && valRef.current.focus(), 50)
  }, [st.correction])

  const cur = currentVal(st, f, pid, st.W, field)
  const allowed = can('submit')

  const submit = () => {
    const v = parseInt(val, 10)
    let e = ''
    if (!allowed) e = 'Your role can’t submit manual updates.'
    else if (!can('submit', f)) e = `You can only update floors ${me.scope.join(' and ')}.`
    else if (isNaN(v) || v < 0 || v > 100) e = 'Enter a value between 0 and 100.'
    else if (v === cur) e = 'The new value is the same as the current one.'
    else if (why.trim().length < 15) e = 'Explain the reason in a sentence or two, so the approver can check it.'
    else if (st.changes.some((c) => c.status === 'Pending' && c.key === f + '-' + pid && c.week === st.W && c.field === field)) e = 'There is already a pending change for this figure.'
    setErr(e)
    if (e) return
    const file = fileRef.current.files[0]
    dispatch({ type: 'submit', payload: { key: f + '-' + pid, f, pid, week: st.W, field, val: v, why: why.trim(), file: file ? file.name : '' } })
    setVal(''); setWhy(''); fileRef.current.value = ''
  }

  return (
    <div className={'panel' + (allowed ? '' : ' disabled-panel')}>
      <h3>Submit a manual update</h3>
      <div className="form">
        <label>Floor
          <select value={f} onChange={(e) => setF(+e.target.value)}>
            {FLOORS.map((x) => <option key={x} value={x} disabled={!inScope(x)}>Floor {x}{inScope(x) ? '' : ' (outside your scope)'}</option>)}
          </select>
        </label>
        <label>Work package
          <select value={pid} onChange={(e) => setPid(e.target.value)}>
            {PKGS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Figure to change
          <select value={field} onChange={(e) => setField(e.target.value)}>
            <option value="obs">Observed progress (site evidence)</option>
            <option value="rep">Contractor-reported progress</option>
          </select>
        </label>
        <label>Week<input readOnly value={'Week ' + st.W} /></label>
        <label>Current value<input readOnly value={cur + '%'} /></label>
        <label>New value (%)<input ref={valRef} type="number" min="0" max="100" value={val} onChange={(e) => setVal(e.target.value)} /></label>
        <label className="full">Reason for the change
          <textarea rows="3" placeholder="What the devices missed, and how you know" value={why} onChange={(e) => setWhy(e.target.value)} />
        </label>
        <label className="full">Supporting photo or document<input ref={fileRef} type="file" /></label>
      </div>
      <p className="err" role="alert">{err}</p>
      <button className="btn primary" onClick={submit}>Submit for approval</button>
    </div>
  )
}

function PendingCard({ c }) {
  const { dispatch, me, can } = useStore()
  const [comment, setComment] = useState('')
  const s = U(c.by)
  const own = c.by === me.id
  const ap = can('approve')
  const decide = (ok) => dispatch({ type: 'decide', payload: { id: c.id, ok, comment: comment.trim() } })
  return (
    <div className="cr">
      <div className="top2"><b>{c.id}: {label(c.f, c.pid)}, week {c.week}</b><small className="muted">{s.name}, {s.role}, {fmtD(c.at)}</small></div>
      <div className="chg">{fieldName(c.field)}: {c.old}% → {c.val}%</div>
      <p>{c.why}</p>
      {c.file && <p className="muted">Attachment: {c.file}</p>}
      {ap && !own ? (
        <div className="row">
          <input placeholder="Comment (required to reject)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn primary" onClick={() => decide(true)}>Approve</button>
          <button className="btn" onClick={() => decide(false)}>Reject</button>
        </div>
      ) : (
        <p className="muted">{own && ap ? 'You submitted this, so another manager or admin has to approve it.' : 'Waiting for a project manager or admin.'}</p>
      )}
    </div>
  )
}

function Mailbox() {
  const { st, dispatch } = useStore()
  const cur = st.selMail ?? (st.mails[0] && st.mails[0].id)
  const m = st.mails.find((x) => x.id === cur)
  return (
    <div className="panel">
      <h3>Email notifications</h3>
      <ul className="mails">
        {st.mails.map((x) => (
          <li key={x.id}>
            <button aria-pressed={x.id === cur} onClick={() => dispatch({ type: 'selMail', id: x.id })}>
              <small>{fmtD(x.at)} · to {x.to.map((e) => e.split('@')[0]).join(', ')}</small>
              <b>{x.subject}</b>
            </button>
          </li>
        ))}
      </ul>
      {m && (
        <div className="mailview">
          <div className="mh">
            <div><b>From:</b> Nerve Center alerts &lt;alerts@nervecenter.example.com&gt;</div>
            <div><b>To:</b> {m.to.join(', ')}</div>
            {m.cc.length > 0 && <div><b>Cc:</b> {m.cc.join(', ')}</div>}
            <div><b>Subject:</b> {m.subject}</div>
            <div><b>Sent:</b> {fmtD(m.at)}</div>
          </div>
          <div className="mb">{m.body}</div>
        </div>
      )}
    </div>
  )
}

export default function Changes() {
  const { st, me, can } = useStore()
  const pending = st.changes.filter((c) => c.status === 'Pending')
  return (
    <>
      <h2>Manual data changes</h2>
      <p className="lede">Device data can be corrected or added by hand, but only by people with the right access. Every manual change waits for a manager or admin to approve it, nobody can approve their own change, and an email goes out each time. The full history stays in the audit trail.</p>
      {!can('submit') && <div className="lock">Signed in as {me.name}, {me.role}. You can see every change and its history, but you can't submit or approve updates.</div>}
      {can('submit') && me.scope && <div className="lock">Signed in as {me.name}, {me.role}. You can submit updates for floors {me.scope.join(' and ')} only. Approvals are done by a project manager or admin.</div>}
      <div className="split">
        <div>
          <SubmitForm />
          <div className="panel" style={{ marginTop: 20 }}>
            <h3>Waiting for approval</h3>
            {pending.map((c) => <PendingCard key={c.id} c={c} />)}
            {!pending.length && <p className="empty">Nothing is waiting for approval.</p>}
          </div>
        </div>
        <Mailbox />
      </div>
      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Audit trail</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Time</th><th>Who</th><th>Action</th><th>Item</th><th>Change</th><th>Status</th></tr></thead>
            <tbody>
              {st.audit.map((a, i) => {
                const u = U(a.who)
                return (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td>{fmtD(a.at)}</td>
                    <td>{u.name}<br /><small className="muted">{u.role}</small></td>
                    <td>{a.action}{a.cr && <><br /><small className="muted">{a.cr}</small></>}</td>
                    <td>{a.item}</td>
                    <td>{a.chg}</td>
                    <td><Pill kind={STATUS_PILL[a.status] || 'idle'}>{a.status}</Pill></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
