import { useMemo, useState } from 'react'
import { MILESTONES, PROJECT, SPOTS, ZONES } from '../data/aars'
import { fmtDay, useProgress } from '../data/progress'
import { useCollection } from '../platform'
import { useStore } from '../state/store.jsx'
import { Kpi } from '../components/ui.jsx'
import { EvidenceStrip, Lightbox, useLightbox } from '../components/Evidence.jsx'

const SERIES = [['facade', 'Facade', 'var(--s1)'], ['interior', 'Interior', 'var(--s2)']]

/** Progress over time: a step line per series, one point per evidence date. */
function ProgressChart({ points }) {
  const [hi, setHi] = useState(null)
  const [table, setTable] = useState(false)
  const W = 640, H = 220, L = 36, R = 104, T = 12, B = 26
  const t0 = +new Date(points[0].date), t1 = +new Date(points[points.length - 1].date)
  const x = (d) => L + ((+new Date(d) - t0) / (t1 - t0 || 1)) * (W - L - R)
  const y = (v) => T + (1 - v / 100) * (H - T - B)
  const step = (k) => points.map((p, i) => `${i ? 'H' + x(p.date) + ' V' : 'M' + x(p.date) + ' '}${y(p[k])}`).join(' ')
  const years = [...new Set(points.map((p) => p.date.slice(0, 7)))]
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    let best = 0
    points.forEach((p, i) => { if (Math.abs(x(p.date) - px) < Math.abs(x(points[best].date) - px)) best = i })
    setHi(best)
  }
  const last = points[points.length - 1]
  return (
    <>
      <div className="chart-head">
        <div className="legend" style={{ marginTop: 0 }}>{SERIES.map(([k, n, c]) => <span key={k}><i style={{ background: c, height: 3, borderRadius: 2 }} />{n}</span>)}</div>
        <button className="link" onClick={() => setTable(!table)}>{table ? 'Show chart' : 'Show as table'}</button>
      </div>
      {table ? (
        <div className="tablewrap"><table><thead><tr><th>Evidence date</th><th className="num">Facade</th><th className="num">Interior</th></tr></thead>
          <tbody>{points.map((p) => <tr key={p.date}><td>{fmtDay(p.date)}</td><td className="num">{p.facade}%</td><td className="num">{p.interior}%</td></tr>)}</tbody></table></div>
      ) : (
        <div className="chart">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Progress over time. Facade ${last.facade}%, interior ${last.interior}% as of ${fmtDay(last.date)}.`} onPointerMove={onMove} onPointerLeave={() => setHi(null)}>
            {[0, 25, 50, 75, 100].map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" /><text x={L - 6} y={y(v) + 4} textAnchor="end" className="axis">{v}%</text></g>)}
            {years.filter((m, i) => i === 0 || m.endsWith('-01') || i === years.length - 1).map((m) => <text key={m} x={Math.min(x(m + '-01') < L ? L : x(m + '-01'), W - R)} y={H - 6} className="axis" textAnchor="middle">{new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</text>)}
            {hi != null && <line x1={x(points[hi].date)} x2={x(points[hi].date)} y1={T} y2={H - B} className="cross" />}
            {SERIES.map(([k, , c]) => <path key={k} d={step(k)} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" />)}
            {SERIES.map(([k, , c]) => points.map((p, i) => <circle key={k + i} cx={x(p.date)} cy={y(p[k])} r={hi === i ? 5 : 4} fill={c} stroke="var(--panel)" strokeWidth="2" />))}
            {SERIES.map(([k, n, c], j) => <text key={k} x={W - R + 8} y={y(last[k]) + 4 + (Math.abs(last.facade - last.interior) < 8 ? (j ? 8 : -6) : 0)} className="endlabel" fill="var(--ink)"><tspan fill={c}>●</tspan> {n} {last[k]}%</text>)}
          </svg>
          {hi != null && (
            <div className="tip" style={{ left: `${(x(points[hi].date) / W) * 100}%` }}>
              <b>{fmtDay(points[hi].date)}</b>
              {SERIES.map(([k, n, c]) => <span key={k}><i style={{ background: c }} />{n} {points[hi][k]}%</span>)}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default function Home() {
  const P = useProgress()
  const { dispatch } = useStore()
  const [snags] = useCollection('snags')
  const [pays] = useCollection('payments')
  const [tags] = useCollection('aiTags')
  const [caps] = useCollection('captures')
  const [box, open, close] = useLightbox()
  const go = (tab) => { dispatch({ type: 'tab', tab }); window.scrollTo(0, 0) }

  const points = useMemo(() => [...P.evidenceDates.filter((d) => d <= PROJECT.today), PROJECT.today].filter((d, i, a) => a.indexOf(d) === i)
    .map((date) => ({ date, facade: P.facadePct(date), interior: P.interiorPct(date) })), [P])
  const warn = P.warnings()
  const openSnags = snags.filter((s) => s.status !== 'closed')
  const earned = MILESTONES.filter((m) => P.milestoneState(m).met).reduce((a, m) => a + m.pct, 0)
  const awaiting = pays.filter((p) => p.status === 'requested').length
  const missing = ZONES.filter((z) => !P.zoneState(z.id).ev.length).length
  const week = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)
  const spotsDone = SPOTS.filter((s) => caps.some((c) => c.spotId === s.id && c.date >= week)).length
  const latest = useMemo(() => {
    const refs = new Map()
    for (const z of ZONES) for (const o of P.zoneState(z.id).ev) refs.set(o.ref, o)
    return [...refs.keys(), 'p24', 'p20', 'p18', 'p16'].map((r) => P.resolve(r)).filter(Boolean)
      .filter((e, i, a) => a.findIndex((q) => q.ref === e.ref) === i).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  }, [P])

  const attention = [
    ...warn.slice(0, 3).map((w) => ({ k: w.key, level: w.level === 'bad' ? '' : ' warn', title: `${w.name}: ${w.days} days ${w.level === 'bad' ? 'late' : 'overdue to start'}`, text: w.text, tab: 'schedule' })),
    ...openSnags.filter((s) => s.sev === 'high').map((s) => ({ k: s.id, level: '', title: 'High-severity snag: ' + s.title, text: s.where, tab: 'snags' })),
    awaiting && { k: 'pay', level: ' warn', title: `${awaiting} payment release${awaiting > 1 ? 's' : ''} waiting for approval`, text: 'Checked against the photo evidence.', tab: 'payments' },
    missing && { k: 'miss', level: ' warn', title: `${missing} facade zones have no photo yet`, text: 'Mostly the dome. One photo from each side fills them in.', tab: 'capture' },
  ].filter(Boolean)

  return (
    <>
      <h2>{PROJECT.name}</h2>
      <p className="lede">{PROJECT.kind}. Architect: {PROJECT.architect}. Every figure on this page comes from dated site photos and videos, checked against the elevation drawings and the plan.</p>
      <div className="kpis">
        <Kpi v={P.facadePct() + '%'} k="Facade complete" />
        <Kpi v={P.interiorPct() + '%'} k="Interior works" />
        <Kpi v={warn.length} k="Stages behind plan" color={warn.length ? 'var(--bad)' : undefined} />
        <Kpi v={openSnags.length} k="Open snags" />
        <Kpi v={earned + '%'} k="Contract earned on evidence" />
        <Kpi v={`${spotsDone}/${SPOTS.length}`} k="Capture spots done this week" />
      </div>
      <div className="split">
        <div className="panel">
          <h3>Progress over time</h3>
          <ProgressChart points={points} />
          <p className="src-note">Each point is a date with new evidence. Photo dates from WhatsApp are when they were shared, so some work happened earlier than shown.</p>
        </div>
        <div className="panel">
          <h3>Needs attention</h3>
          {attention.map((a) => (
            <div key={a.k} className={'alert' + a.level}>
              <b>{a.title}</b><p>{a.text}</p>
              <button className="link" onClick={() => go(a.tab)}>Open</button>
            </div>
          ))}
          {!attention.length && <p className="empty">Nothing needs attention.</p>}
          {tags.filter((t) => t.status === 'suggested').length > 0 && <p><button className="link" onClick={() => go('ai')}>{tags.filter((t) => t.status === 'suggested').length} AI suggestions waiting for review</button></p>}
        </div>
      </div>
      <div className="panel" style={{ marginTop: 20 }}>
        <div className="chart-head"><h3 style={{ margin: 0 }}>Latest evidence</h3><button className="link" onClick={() => go('photos')}>All photos</button></div>
        <EvidenceStrip items={latest} open={open} size={96} />
      </div>
      <Lightbox item={box} onClose={close} />
    </>
  )
}
