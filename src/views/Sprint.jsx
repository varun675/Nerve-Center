import { useMemo, useState } from 'react'
import { PKGS, allCells } from '../data/model'
import { CAUSES, CAUSE_COL, SPRINTS, sprintDates, sprintTasks } from '../data/sprint'
import { useStore } from '../state/store.jsx'
import { Kpi, Pill } from '../components/ui.jsx'

const STATUS_PILL = { Done: 'ok', 'Partly done': 'watch', 'Not started': 'bad', Unverified: 'idle' }

function SCurve({ st, s }) {
  const pts = useMemo(() => Array.from({ length: 9 }, (_, w) => {
    const cs = allCells(st, w)
    return { w, pl: cs.reduce((a, c) => a + c.planned, 0) / cs.length, ob: cs.reduce((a, c) => a + c.obs, 0) / cs.length }
  }), [st])
  const W0 = 560, H0 = 220, L = 36, B = 24
  const x = (w) => L + (w / 8) * (W0 - L - 10)
  const y = (v) => H0 - B - (v / 100) * (H0 - B - 10)
  const ob = pts.filter((p) => p.w <= s.end)
  const last = ob[ob.length - 1]
  return (
    <svg viewBox={`0 0 ${W0} ${H0}`} role="img" aria-label="Planned and achieved progress by week">
      <rect x={x(s.start - 1)} y="6" width={x(s.end) - x(s.start - 1)} height={H0 - B - 6} fill="var(--blue-soft)" />
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={L} x2={W0 - 10} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{v}%</text>
        </g>
      ))}
      {[0, 2, 4, 6, 8].map((w) => <text key={w} x={x(w)} y={H0 - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">W{w}</text>)}
      <polyline points={pts.map((p) => `${x(p.w)},${y(p.pl)}`).join(' ')} fill="none" stroke="var(--muted)" strokeWidth="2" strokeDasharray="6 4" />
      <polyline points={ob.map((p) => `${x(p.w)},${y(p.ob)}`).join(' ')} fill="none" stroke="var(--blue)" strokeWidth="3" />
      <circle cx={x(last.w)} cy={y(last.ob)} r="4" fill="var(--blue)" />
      <text x={x(last.w) - 8} y={y(last.ob) + 34} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--blue)">
        {Math.round(last.ob)}% achieved vs {Math.round(pts[s.end].pl)}% planned
      </text>
    </svg>
  )
}

export default function Sprint() {
  const { st, dispatch } = useStore()
  const [sp, setSp] = useState(3)
  const [fp, setFp] = useState('')
  const [fs, setFs] = useState('')
  const s = SPRINTS[sp - 1]
  const T = useMemo(() => sprintTasks(st, s), [st, s])
  const fixOf = (t) => st.fixState[t.key + '|' + sp] || (t.status === 'Done' ? '—' : 'Open')
  const planSum = T.reduce((a, t) => a + t.plan, 0)
  const doneSum = T.reduce((a, t) => a + Math.min(t.done, t.plan), 0)
  const achieved = Math.round((doneSum / planSum) * 100)
  const cnt = (k) => T.filter((t) => t.status === k).length

  const lost = {}
  T.filter((t) => t.cause && t.lost > 0).forEach((t) => { const c = CAUSES[t.cause].cat; lost[c] = (lost[c] || 0) + t.lost })
  const pareto = Object.entries(lost).sort((a, b) => b[1] - a[1])

  const col = (t) => (t.status === 'Done' ? 'var(--ok)' : t.status === 'Unverified' ? 'var(--muted)' : t.pct < 50 ? 'var(--bad)' : 'var(--warn)')
  const shown = T.filter((t) => (!fp || t.p.id === fp) && (!fs || t.status === fs)).sort((a, b) => a.pct - b.pct)
  const late = T.filter((t) => t.cause).sort((a, b) => b.lost - a.lost)
  const next = SPRINTS[sp] || null
  const open = (key) => dispatch({ type: 'dialog', dialog: { type: 'task', key, sprint: sp } })

  const [copied, setCopied] = useState('')
  const copy = async () => {
    const text = document.getElementById('sprint-summary').innerText
    try { await navigator.clipboard.writeText(text); setCopied('Copied') } catch { setCopied('Copy not available here') }
    setTimeout(() => setCopied(''), 1800)
  }

  return (
    <>
      <div className="tools">
        <div style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ margin: 0 }}>Sprint review</h2>
          <p className="lede" style={{ margin: '2px 0 0' }}>Two-week sprints. What was planned, what the site captures show was done, why the rest slipped, and what's being done about it.</p>
        </div>
        <div className="seg" role="group" aria-label="Choose sprint">
          {SPRINTS.map((x) => (
            <button key={x.n} aria-pressed={x.n === sp} onClick={() => setSp(x.n)}>Sprint {x.n}<small>Weeks {x.start}–{x.end}</small></button>
          ))}
        </div>
      </div>
      <div className="kpis">
        <Kpi v={`${achieved}%`} k={`Sprint plan achieved, ${sprintDates(s)}`} />
        <Kpi v={T.length} k="Tasks planned this sprint" />
        <Kpi v={cnt('Done')} color="var(--ok)" k="Done to target" />
        <Kpi v={cnt('Partly done') + cnt('Not started')} color="var(--warn)" k="Behind target" />
        <Kpi v={cnt('Unverified')} k="Can't confirm, evidence too old" />
      </div>
      <div className="grid2">
        <div className="panel">
          <h3>Planned vs achieved, whole tower</h3>
          <SCurve st={st} s={s} />
          <div className="legend">
            <span><i style={{ borderTop: '2px dashed var(--muted)', height: 0, borderRadius: 0 }} />Planned</span>
            <span><i style={{ background: 'var(--blue)', height: 3 }} />Achieved (from captures)</span>
            <span><i style={{ background: 'var(--blue-soft)' }} />This sprint</span>
          </div>
        </div>
        <div className="panel">
          <h3>Why work slipped this sprint</h3>
          {pareto.length ? pareto.map(([c, v]) => (
            <div key={c} className="hbar" style={{ gridTemplateColumns: '190px minmax(0,1fr) 70px' }}>
              <span>{c}</span>
              <span className="tr"><i style={{ width: (v / pareto[0][1]) * 100 + '%', background: CAUSE_COL[c] }} /></span>
              <span className="n">{v} pts</span>
            </div>
          )) : <p className="empty">Nothing slipped this sprint.</p>}
          <p className="src-note">Bars show progress points lost against the sprint plan, grouped by root cause.</p>
        </div>
      </div>

      <div className="tools" style={{ marginTop: 22 }}>
        <h3 style={{ margin: 0, flex: 1 }}>Sprint tasks</h3>
        <label className="chk">Work package
          <select value={fp} onChange={(e) => setFp(e.target.value)}>
            <option value="">All</option>
            {PKGS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="chk">Status
          <select value={fs} onChange={(e) => setFs(e.target.value)}>
            <option value="">All</option>
            {Object.keys(STATUS_PILL).map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Task</th><th className="num">Target</th><th className="num">Achieved</th><th>Sprint completion</th><th>Status</th><th>Reason</th><th>Fix owner</th><th>Fix status</th></tr></thead>
          <tbody>
            {shown.map((t) => {
              const c = t.cause && CAUSES[t.cause]
              return (
                <tr key={t.key} tabIndex={0} onClick={(e) => { if (!e.target.closest('select')) open(t.key) }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.target.closest('select')) open(t.key) }}>
                  <td>F{t.f} {t.p.name}</td>
                  <td className="num">{t.b.planned}%</td>
                  <td className="num">{t.b.obs}%</td>
                  <td>
                    {t.status === 'Unverified' ? <span className="empty">Needs a new capture</span> : (
                      <div className="prog"><span className="tr"><i style={{ width: t.pct + '%', background: col(t) }} /></span><b>{t.pct}%</b></div>
                    )}
                  </td>
                  <td><Pill kind={STATUS_PILL[t.status]}>{t.status}</Pill></td>
                  <td>{c ? <span className="cause" style={{ color: CAUSE_COL[c.cat] }}>{c.cat}</span> : '—'}</td>
                  <td>{c ? c.owner : '—'}</td>
                  <td>
                    {c ? (
                      <select aria-label="Fix status" value={fixOf(t)} onChange={(e) => dispatch({ type: 'fix', key: t.key + '|' + sp, value: e.target.value })}>
                        {['Open', 'In progress', 'Closed'].map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
            {!shown.length && <tr><td colSpan={8} className="empty">No tasks match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="tools" style={{ margin: '0 0 6px' }}>
          <h3 style={{ margin: 0, flex: 1 }}>Summary for the sprint review meeting</h3>
          <button className="btn" onClick={copy}>{copied || 'Copy summary'}</button>
        </div>
        <div id="sprint-summary">
          <ul>
            <li>Sprint {sp} ({sprintDates(s)}): <b>{achieved}%</b> of planned progress achieved across {T.length} tasks. {cnt('Done')} done to target, {cnt('Partly done') + cnt('Not started')} behind, {cnt('Unverified')} unverified.</li>
            {late.map((t) => {
              const c = CAUSES[t.cause]
              return <li key={t.key}><b>F{t.f} {t.p.name}</b>: {t.b.obs}% against {t.b.planned}% target. Cause: {c.cat.toLowerCase()}. Fix: {c.fix[0].toLowerCase()} ({c.owner}, {fixOf(t).toLowerCase()}).</li>
            })}
            {next && <li>Carry into Sprint {next.n}: {late.filter((t) => t.status !== 'Unverified').length} tasks with open gaps, to be re-measured from the week {next.start} captures.</li>}
          </ul>
        </div>
      </div>
    </>
  )
}
