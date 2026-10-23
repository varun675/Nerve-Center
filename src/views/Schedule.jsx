import { useState } from 'react'
import { PLAN, PROJECT } from '../data/aars'
import { fmtDay, useProgress } from '../data/progress'
import { useActor, useCollection } from '../platform'
import { useStore } from '../state/store.jsx'
import { Kpi } from '../components/ui.jsx'

const DAY = 864e5
const COL = { done: 'var(--ok)', prog: 'var(--warn)', todo: 'var(--idle)' }

export default function Schedule() {
  const P = useProgress()
  const actor = useActor()
  const { dispatch } = useStore()
  const [edits, api] = useCollection('plan')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})
  const keys = Object.keys(PLAN)
  const rows = keys.map((key) => {
    const [start, finish] = P.plan[key]
    const s = P.itemState(key)
    const kind = key.split(':')[0]
    const obs = kind === 'trade' ? P.tradeState(key.split(':')[1]).ev : []
    const first = obs.map((o) => o.date).sort()[0]
    return { key, name: P.itemName(key), start, finish, s, first, edited: edits.some((e) => e.id === key.replace(':', '~')) }
  })
  const t0 = new Date(Math.min(...rows.map((r) => +new Date(r.start)))), t1 = new Date(Math.max(...rows.map((r) => +new Date(r.finish))))
  const span = (t1 - t0) / DAY
  const x = (d) => ((new Date(d) - t0) / DAY / span) * 100
  const months = []
  for (let d = new Date(t0.getFullYear(), t0.getMonth(), 1); d <= t1; d.setMonth(d.getMonth() + 1)) if (d >= t0 && d.getMonth() % 3 === 0) months.push(new Date(d))
  const warn = P.warnings()
  const finishAll = rows.reduce((a, r) => (r.finish > a ? r.finish : a), '')

  const save = async (key) => {
    const d = draft
    if (!d.start || !d.finish || d.finish < d.start) return dispatch({ type: 'toast', msg: 'The finish date has to be after the start date.', bad: true })
    await api.set(key.replace(':', '~'), { start: d.start, finish: d.finish, by: actor.id, at: new Date().toISOString() })
    setEditing(null)
    dispatch({ type: 'toast', msg: 'Plan updated. Warnings recalculated.' })
  }

  return (
    <>
      <h2>Schedule and early warnings</h2>
      <p className="lede">Planned dates for every stage, against what the photos and videos show. Anything past its planned finish without evidence of completion, or past its start with no sign of work, is flagged.</p>
      <div className="alert warn"><b>The planned dates are estimates</b><p>They were set from the evidence and a typical villa sequence, not from the contractor's programme. {actor.canApprove ? 'Select Edit on any row to put in the real dates.' : 'A project manager can replace them with the real dates.'}</p></div>
      <div className="kpis">
        <Kpi v={warn.filter((w) => w.level === 'bad').length} k="Stages past their planned finish" color="var(--bad)" />
        <Kpi v={warn.filter((w) => w.level === 'warn').length} k="Stages that should have started" color="var(--warn)" />
        <Kpi v={rows.filter((r) => r.s.status === 'done').length + ' of ' + rows.length} k="Stages complete on evidence" />
        <Kpi v={fmtDay(finishAll)} k="Planned handover" />
      </div>
      <div className="split">
        <div className="panel" style={{ overflowX: 'auto' }}>
          <div className="gantt" style={{ minWidth: 640 }}>
            <div className="g-row g-head"><span />
              <div className="g-track">{months.map((m) => <span key={+m} style={{ left: x(m) + '%' }}>{m.toLocaleDateString('en-GB', { month: 'short' })}{m.getMonth() === 0 ? ' ' + m.getFullYear() : ''}</span>)}</div>
            </div>
            {rows.map((r) => (
              <div key={r.key} className="g-row">
                <span className="g-name">{r.name}{r.edited && <small> · edited</small>}
                  {actor.canApprove && <button className="link" onClick={() => { setEditing(r.key); setDraft({ start: r.start, finish: r.finish }) }}>Edit</button>}
                </span>
                <div className="g-track">
                  <i className="g-today" style={{ left: x(PROJECT.today) + '%' }} />
                  <b className={'g-bar ' + r.s.status} style={{ left: x(r.start) + '%', width: x(r.finish) - x(r.start) + '%' }} title={`${fmtDay(r.start)} to ${fmtDay(r.finish)}`} />
                  {r.first && <em className="g-ev" style={{ left: x(r.first) + '%' }} title={'First evidence ' + fmtDay(r.first)} />}
                </div>
                {editing === r.key && (
                  <form className="form g-edit" onSubmit={(e) => { e.preventDefault(); save(r.key) }}>
                    <label>Start<input type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></label>
                    <label>Finish<input type="date" value={draft.finish} onChange={(e) => setDraft({ ...draft, finish: e.target.value })} /></label>
                    <div className="tools full" style={{ marginBottom: 0 }}><button className="btn primary">Save</button><button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button></div>
                  </form>
                )}
              </div>
            ))}
          </div>
          <div className="legend">
            <span><i style={{ background: COL.done }} />Complete on evidence</span>
            <span><i style={{ background: COL.prog }} />In progress</span>
            <span><i style={{ background: COL.todo, border: '1px solid var(--line)' }} />No evidence yet</span>
            <span><i style={{ background: 'var(--ink)', borderRadius: '50%' }} />First photo of the work</span>
            <span><i style={{ background: 'var(--bad)', width: 2 }} />Today, {fmtDay(PROJECT.today)}</span>
          </div>
        </div>
        <div className="panel">
          <h3>Early warnings</h3>
          {warn.map((w) => (
            <div key={w.key} className={'alert' + (w.level === 'warn' ? ' warn' : '')}>
              <b>{w.name}: {w.days} days {w.level === 'bad' ? 'late' : 'overdue to start'}</b>
              <p>{w.text}</p>
              {w.missing.length > 0 && w.key.startsWith('facade') && <p className="empty" style={{ margin: 0 }}>Not yet shown: {w.missing.slice(0, 3).join(', ')}{w.missing.length > 3 ? ` and ${w.missing.length - 3} more` : ''}.</p>}
            </div>
          ))}
          {!warn.length && <p className="empty">Nothing is behind plan.</p>}
        </div>
      </div>
    </>
  )
}
