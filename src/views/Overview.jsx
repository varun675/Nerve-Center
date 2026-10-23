import { useMemo } from 'react'
import { FLOORS, PKGS, allCells, avg, statusText } from '../data/model'
import { useStore } from '../state/store.jsx'
import { Kpi, Pipeline } from '../components/ui.jsx'

export default function Overview() {
  const { st, dispatch } = useStore()
  const cells = useMemo(() => allCells(st, st.W), [st])
  const act = cells.filter((c) => c.started)
  const fresh = act.length ? Math.round((100 * act.filter((c) => c.fresh <= 72).length) / act.length) : 0
  const open = (key) => dispatch({ type: 'dialog', dialog: { type: 'evidence', key } })
  const flagged = cells.filter((c) => c.flagged).sort((a, b) => b.gap - a.gap)
  const behind = cells.filter((c) => c.status === 'behind' && !c.flagged)
  const stale = cells.filter((c) => c.started && c.fresh > 72)

  return (
    <>
      <h2>Tower B, floors 3 to 8</h2>
      <p className="lede">Each block is one floor and one work package. Colour shows progress against plan from site captures. A red dot means the contractor's report doesn't match what the cameras saw. Select any block to see the evidence.</p>
      <div className="kpis">
        <Kpi v={`${avg(act.map((c) => c.obs))}%`} small={`of ${avg(act.map((c) => c.planned))}% planned`} k="Observed progress, active packages" />
        <Kpi v={flagged.length} color="var(--bad)" k="Contractor reports that don't match evidence" />
        <Kpi v={cells.filter((c) => c.needsReview).length} k="Detections waiting for a person to confirm" />
        <Kpi v={`${fresh}%`} k="Active packages with evidence under 72 h old" />
      </div>
      <div className="split">
        <div className="panel">
          <div className="tower">
            <div />
            {PKGS.map((p) => <div key={p.id} className="hd">{p.name}</div>)}
            {FLOORS.map((f) => [
              <div key={'f' + f} className="fl">F{f}</div>,
              ...PKGS.map((p) => {
                const c = cells.find((x) => x.key === f + '-' + p.id)
                return (
                  <button key={c.key} className={'cell ' + c.status} onClick={() => open(c.key)}
                    aria-label={`Floor ${f} ${p.name}: ${c.started ? `${c.obs}% observed, ${statusText[c.status]}` : 'not started'}${c.flagged ? ', report mismatch' : ''}`}>
                    <span className="fill" style={{ height: c.started ? Math.max(c.obs, 6) + '%' : 0 }} />
                    {c.flagged && <span className="flag" aria-hidden="true" />}
                    {c.manual && <span className="mark" title="Manually changed and approved">✎ manual</span>}
                    <span className="t">{c.started ? `${c.obs}%` : '—'}</span>
                    <span className="s">{c.started ? `${statusText[c.status]}${c.variance < 0 ? ` (${c.variance})` : ''}` : 'Not started'}</span>
                  </button>
                )
              }),
            ])}
          </div>
          <div className="ground" aria-hidden="true" />
          <div className="legend">
            <span><i style={{ background: 'var(--ok)' }} />On track</span>
            <span><i style={{ background: 'var(--warn)' }} />Slipping 5–15 pts</span>
            <span><i style={{ background: 'var(--bad)' }} />Behind 15+ pts</span>
            <span><i style={{ background: 'var(--idle)', border: '1px solid var(--line)' }} />Not started</span>
            <span><i style={{ background: 'var(--bad)', borderRadius: '50%' }} />Report mismatch</span>
          </div>
        </div>
        <div className="panel">
          <h3>Needs attention this week</h3>
          {flagged.map((c) => (
            <div key={c.key} className="alert">
              <b>F{c.f} {c.p.name}: report {c.gap} points higher than site</b>
              <p>Reported {c.reported}%, observed {c.obs}%.{st.actions[c.key] ? ' Action agreed.' : ''}</p>
              <button className="link" onClick={() => open(c.key)}>See evidence</button>
            </div>
          ))}
          {behind.map((c) => (
            <div key={c.key} className="alert warn">
              <b>F{c.f} {c.p.name}: {Math.abs(c.variance)} points behind plan</b>
              <p>Observed {c.obs}% against {c.planned}% planned.</p>
              <button className="link" onClick={() => open(c.key)}>See evidence</button>
            </div>
          ))}
          {stale.length > 0 && (
            <div className="alert warn">
              <b>{stale.length} package{stale.length > 1 ? 's' : ''} with evidence older than 72 hours</b>
              <p>{stale.map((c) => `F${c.f} ${c.p.name}`).join(', ')}. Schedule a handheld capture.</p>
            </div>
          )}
          {!flagged.length && !behind.length && !stale.length && <p className="empty">Nothing needs attention this week. All reports match the evidence.</p>}
        </div>
      </div>
      <Pipeline steps={[
        ['Capture', '360° walkthroughs, drone flights and phone photos, tagged to floor and zone.'],
        ['Detect', 'Vision models estimate how complete each work package is, with a confidence score.'],
        ['Reconcile', "Observed progress is checked against the schedule and the contractor's report."],
        ['Decide', 'Gaps become alerts, review tasks and a weekly report, each linked to its evidence.'],
      ]} />
    </>
  )
}
