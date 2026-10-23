import { useRef, useState } from 'react'
import { PKGS, allCells, avg, fieldName, label, weekDates } from '../data/model'
import { U } from '../data/users'
import { useStore } from '../state/store.jsx'

export default function WeeklyReport() {
  const { st } = useStore()
  const W = st.W
  const ref = useRef(null)
  const [copied, setCopied] = useState('')
  const cells = allCells(st, W)
  const act = cells.filter((c) => c.started)
  const flagged = cells.filter((c) => c.flagged)
  const behind = cells.filter((c) => c.status === 'behind')
  const done = cells.filter((c) => c.obs === 100)
  const late = cells.filter((c) => c.lag > 0 && W >= c.s + 0.5 && c.obs < 100)
  const changes = st.changes.filter((x) => x.week === W)
  const copy = async () => {
    try { await navigator.clipboard.writeText(ref.current.innerText); setCopied('Copied') } catch { setCopied('Copy not available here') }
    setTimeout(() => setCopied(''), 1800)
  }
  return (
    <>
      <div className="tools noprint">
        <h2 style={{ margin: 0, flex: 1 }}>Weekly progress report</h2>
        <button className="btn" onClick={copy}>{copied || 'Copy as text'}</button>
        <button className="btn primary" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
      <p className="lede noprint">Generated from this week's evidence. Every figure matches the dashboard and can be traced back to its capture.</p>
      <article className="report" ref={ref}>
        <h1>Tower B weekly progress report</h1>
        <div className="meta">Week {W}, {weekDates(W)}. Generated automatically from site evidence.</div>
        <h4>Summary</h4>
        <ul>
          <li>Active work packages are at <b>{avg(act.map((c) => c.obs))}%</b> observed against <b>{avg(act.map((c) => c.planned))}%</b> planned.</li>
          <li>{done.length} package{done.length !== 1 ? 's' : ''} complete. {behind.length} more than 15 points behind plan.</li>
          <li>{flagged.length} contractor report{flagged.length !== 1 ? 's' : ''} differ from site evidence by 10 points or more.</li>
        </ul>
        <h4>Progress by work package</h4>
        <table>
          <thead><tr><th>Work package</th><th className="num">Active floors</th><th className="num">Planned</th><th className="num">Observed</th><th className="num">Mismatches</th></tr></thead>
          <tbody>
            {PKGS.map((p) => {
              const a = act.filter((c) => c.p.id === p.id)
              if (!a.length) return null
              return <tr key={p.id}><td>{p.name}</td><td className="num">{a.length}</td><td className="num">{avg(a.map((c) => c.planned))}%</td><td className="num">{avg(a.map((c) => c.obs))}%</td><td className="num">{a.filter((c) => c.flagged).length}</td></tr>
            })}
          </tbody>
        </table>
        <h4>Report mismatches</h4>
        {flagged.length ? <ul>{flagged.map((c) => <li key={c.key}>F{c.f} {c.p.name}: reported {c.reported}%, observed {c.obs}%. {st.actions[c.key] ? `Action agreed: ${st.actions[c.key]}` : 'No action recorded yet.'}</li>)}</ul> : <p>None this week.</p>}
        <h4>Schedule risks</h4>
        {late.length ? <ul>{late.map((c) => <li key={c.key}>F{c.f} {c.p.name} forecast to finish {(c.lag * 7).toFixed(0)} days late (week {c.fcFinish.toFixed(1)}).</li>)}</ul> : <p>No forecast delays.</p>}
        <h4>Manual data changes</h4>
        {changes.length ? (
          <ul>{changes.map((x) => <li key={x.id}>{x.id}: {label(x.f, x.pid)} {fieldName(x.field)} {x.old}% → {x.val}%, submitted by {U(x.by).name}. {x.status}{x.decidedBy ? ` by ${U(x.decidedBy).name}` : ''}.</li>)}</ul>
        ) : <p>No manual changes this week. All figures come straight from site devices.</p>}
        <p className="src">Each figure links to a dated capture in the platform. Evidence IDs are available on request.</p>
      </article>
    </>
  )
}
