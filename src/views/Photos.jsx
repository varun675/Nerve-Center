import { useEffect, useMemo, useState } from 'react'
import { PHOTOS, byDate, fmtDate, mediaUrl, views } from '../data/media'
import { Kpi } from '../components/ui.jsx'
import { Pano } from '../components/Evidence.jsx'

const MODES = [['grid', 'All photos', 'Grouped by trade'], ['compare', 'Before and after', 'Drag to compare'], ['scrub', 'Timeline', 'Step through dates']]

export function Compare({ a, b }) {
  const [x, setX] = useState(50)
  return (
    <div className="ba">
      <img src={mediaUrl(b.file)} alt={`${b.view}, ${fmtDate(b.date)}`} />
      <img src={mediaUrl(a.file)} alt={`${a.view}, ${fmtDate(a.date)}`} style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }} />
      <i style={{ left: x + '%' }} />
      <span className="tag l">{fmtDate(a.date)}</span>
      <span className="tag r">{fmtDate(b.date)}</span>
      <input type="range" min="0" max="100" value={x} onChange={(e) => setX(+e.target.value)} aria-label="Move the divider between the earlier and later photo" />
    </div>
  )
}

export default function Photos() {
  const all = useMemo(() => [...PHOTOS].sort(byDate), [])
  const vs = views(all)
  const [view, setView] = useState(null)
  const [mode, setMode] = useState('grid')
  const [ai, setAi] = useState(0)
  const [bi, setBi] = useState(-1)
  const [si, setSi] = useState(0)
  const [play, setPlay] = useState(false)
  const v = view && vs.includes(view) ? view : vs[0]
  const set = all.filter((p) => p.view === v)
  const last = set.length - 1
  const A = set[Math.min(ai, last)], B = set[bi < 0 ? last : Math.min(bi, last)]
  const S = set[Math.min(si, last)]

  useEffect(() => {
    if (!play) return
    const t = setInterval(() => setSi((i) => (i >= last ? 0 : i + 1)), 1200)
    return () => clearInterval(t)
  }, [play, last])

  const pick = (nv) => { setView(nv); setAi(0); setBi(-1); setSi(0); setPlay(false) }

  return (
    <>
      <h2>Photo timeline</h2>
      <p className="lede">Site photos grouped by trade. Within a group, compare any two photos with the slider or step through them in date order. Before and after works best with photos taken from the same spot on different days.</p>
      <div className="kpis">
        <Kpi v={all.length} k="Site photos" />
        <Kpi v={vs.length} k="Trades and areas" />
        <Kpi v={all.length ? fmtDate(all[0].date) : '—'} k="First capture" />
        <Kpi v={all.length ? fmtDate(all[all.length - 1].date) : '—'} k="Latest capture" />
      </div>
      <div className="split">
        <div className="panel">
          {!all.length ? (
            <div className="ph media-ph">No photos yet. Add them to <code>public/media/photos</code> and list them in <code>src/data/media.js</code>.</div>
          ) : (
            <>
              <div className="tools">
                <label className="chk">Trade or area
                  <select className="sel" value={v} onChange={(e) => pick(e.target.value)}>{vs.map((x) => <option key={x}>{x}</option>)}</select>
                </label>
                <div className="seg" role="group" aria-label="Display">
                  {MODES.map(([id, t, s]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{t}<small>{s}</small></button>)}
                </div>
              </div>

              {mode === 'compare' && (set.length < 2
                ? <p className="empty">Only one photo from this viewpoint so far. Add a later photo from the same spot to compare.</p>
                : <>
                  <Compare a={A} b={B} />
                  <div className="form" style={{ marginTop: 12 }}>
                    <label>Before<select value={Math.min(ai, last)} onChange={(e) => setAi(+e.target.value)}>{set.map((p, i) => <option key={i} value={i}>{fmtDate(p.date)}{p.note ? ', ' + p.note : ''}</option>)}</select></label>
                    <label>After<select value={bi < 0 ? last : Math.min(bi, last)} onChange={(e) => setBi(+e.target.value)}>{set.map((p, i) => <option key={i} value={i}>{fmtDate(p.date)}{p.note ? ', ' + p.note : ''}</option>)}</select></label>
                  </div>
                </>)}

              {mode === 'scrub' && (
                <>
                  <div className="shot"><img src={mediaUrl(S.file)} alt={`${S.view}, ${fmtDate(S.date)}`} /><span className="tag l">{fmtDate(S.date)}</span></div>
                  <div className="tools" style={{ marginTop: 12 }}>
                    <button className="btn" onClick={() => setPlay(!play)} disabled={set.length < 2}>{play ? 'Pause' : 'Play'}</button>
                    <input type="range" style={{ flex: 1 }} min="0" max={last} value={Math.min(si, last)} onChange={(e) => { setPlay(false); setSi(+e.target.value) }} aria-label="Capture date" />
                    <span className="empty">{Math.min(si, last) + 1} of {set.length}</span>
                  </div>
                  {S.note && <p style={{ margin: 0 }}>{S.note}</p>}
                </>
              )}

              {mode === 'grid' && vs.map((w) => (
                <div key={w} style={{ marginBottom: 14 }}>
                  <h3>{w}</h3>
                  <div className="mgrid">
                    {all.filter((p) => p.view === w).map((p, i) => (
                      <figure key={i}>
                        {p.pano ? <Pano src={mediaUrl(p.file)} height={200} /> : <a href={mediaUrl(p.file)} target="_blank" rel="noopener noreferrer"><img src={mediaUrl(p.file)} alt={p.view} loading="lazy" /></a>}
                        <figcaption><b>{p.note || p.view}</b>{fmtDate(p.date)}{p.floor ? ` · ${p.floor}` : ''}{p.zone ? `, ${p.zone}` : ''}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        <div className="panel">
          {v && (
            <>
              <h3>{v}</h3>
              <ul className="zlist">
                {set.map((p, i) => (
                  <li key={i}><span>{p.note || p.view}<small>{[p.floor, p.zone].filter(Boolean).join(', ')}</small></span><b>{fmtDate(p.date)}</b></li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  )
}
