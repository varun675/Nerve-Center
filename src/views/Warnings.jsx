import { SUCC, allCells, pkg } from '../data/model'
import { useStore } from '../state/store.jsx'

const LO = 0, HI = 9
const pos = (x) => ((x - LO) / (HI - LO)) * 100

export default function Warnings() {
  const { st, dispatch } = useStore()
  const W = st.W
  const cells = allCells(st, W)
  const rows = []
  const warns = []
  cells.filter((c) => c.lag > 0).sort((a, b) => a.s - b.s).forEach((c) => {
    rows.push(c)
    const sp = SUCC[c.p.id]
    const n = sp && cells.find((x) => x.key === c.f + '-' + sp)
    if (n && !rows.includes(n)) rows.push(n)
    if (W >= c.s + 0.5 && c.obs < 100) {
      const block = n ? Math.round((c.fcFinish - n.s) * 7) : 0
      warns.push({ c, n, sp, block })
    }
  })
  return (
    <>
      <h2>Slippage and knock-on effects</h2>
      <p className="lede">Forecast finish dates come from the observed rate of progress. Where a late finish blocks the next trade on that floor, it's raised now rather than at the month-end report.</p>
      <div className="split">
        <div className="panel gantt">
          <div className="scale"><div /><div className="ticks">
            {Array.from({ length: HI }, (_, i) => <span key={i} style={{ left: pos(i + 1) + '%' }}>W{i + 1}</span>)}
          </div></div>
          {rows.map((c) => (
            <div key={c.key} className="grow">
              <div className="nm">F{c.f} {c.p.name}</div>
              <div className="track">
                <span className="bar plan" style={{ left: pos(c.s) + '%', width: pos(c.planFinish) - pos(c.s) + '%' }} />
                <span className={'bar fc' + (c.lag > 0 ? ' late' : '')} style={{ left: pos(c.s) + '%', width: pos(c.fcFinish) - pos(c.s) + '%' }} />
                <span className="nowline" style={{ left: pos(W) + '%' }} />
              </div>
            </div>
          ))}
          <div className="legend">
            <span><i style={{ border: '1.5px dashed var(--muted)' }} />Planned</span>
            <span><i style={{ background: 'var(--blue)' }} />Forecast</span>
            <span><i style={{ background: 'var(--bad)' }} />Forecast late</span>
            <span><i style={{ background: 'var(--warn)', width: 3 }} />This week</span>
          </div>
        </div>
        <div className="panel">
          <h3>Warnings</h3>
          {warns.map(({ c, n, sp, block }) => (
            <div key={c.key} className="alert">
              <b>F{c.f} {c.p.name} forecast {(c.lag * 7).toFixed(0)} days late</b>
              <p>
                At the observed rate it finishes in week {c.fcFinish.toFixed(1)} instead of {c.planFinish.toFixed(1)}.
                {n && block > 0 && ` ${pkg(sp).name} on F${c.f} is due to start in week ${n.s.toFixed(1)} and would be held up by about ${block} days.`}
                {' '}The month-end report would show this at the end of week 8.
              </p>
              <button className="link" onClick={() => dispatch({ type: 'dialog', dialog: { type: 'evidence', key: c.key } })}>See evidence</button>
            </div>
          ))}
          {!warns.length && <p className="empty">No slippage detected yet in week {W}. Move to a later week to see warnings appear.</p>}
        </div>
      </div>
    </>
  )
}
