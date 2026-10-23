import { useMemo, useState } from 'react'
import { allCells, statusText } from '../data/model'
import { useStore } from '../state/store.jsx'
import { Pill } from '../components/ui.jsx'

export default function Reconciliation() {
  const { st, dispatch } = useStore()
  const [only, setOnly] = useState(false)
  const rows = useMemo(() => allCells(st, st.W)
    .filter((c) => c.started && (!only || c.flagged))
    .sort((a, b) => b.gap - a.gap || a.variance - b.variance), [st, only])
  const open = (key) => dispatch({ type: 'dialog', dialog: { type: 'evidence', key } })
  return (
    <>
      <h2>Contractor report against site evidence</h2>
      <p className="lede">Every active work package, with the planned figure from the schedule, the contractor's reported figure, and what the site captures show. A gap of 10 points or more is flagged.</p>
      <div className="tools">
        <label className="chk"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Show flagged only</label>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Floor</th><th>Work package</th><th className="num">Planned</th><th className="num">Reported</th><th className="num">Observed</th><th className="num">Gap</th><th className="num">Confidence</th><th>Schedule</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.key} tabIndex={0} onClick={() => open(c.key)} onKeyDown={(e) => e.key === 'Enter' && open(c.key)}>
                <td>F{c.f}</td><td>{c.p.name}</td>
                <td className="num">{c.planned}%</td><td className="num">{c.reported}%</td><td className="num">{c.obs}%</td>
                <td className={'num' + (c.flagged ? ' gap-bad' : '')}>{c.gap > 0 ? '+' : ''}{c.gap}</td>
                <td className="num">{c.manual ? 'Manual, approved' : c.ov ? 'Confirmed' : Math.round(c.conf * 100) + '%'}</td>
                <td><Pill kind={c.status}>{statusText[c.status]}</Pill></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} className="empty">No flagged packages this week.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
