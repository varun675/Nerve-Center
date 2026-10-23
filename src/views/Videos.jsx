import { useMemo, useRef, useState } from 'react'
import { KINDS, VIDEOS, byDate, fmtDate, mediaUrl } from '../data/media'
import { Kpi } from '../components/ui.jsx'

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function Videos() {
  const all = useMemo(() => [...VIDEOS].sort(byDate).reverse(), [])
  const [kind, setKind] = useState('all')
  const [sel, setSel] = useState(0)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)
  const ref = useRef(null)
  const list = all.filter((x) => kind === 'all' || x.kind === kind)
  const cur = list[Math.min(sel, list.length - 1)]
  const chapters = cur?.chapters || []
  const at = chapters.filter((c) => c.t <= t).pop()
  const seek = (s) => { const el = ref.current; if (el) { el.currentTime = s; el.play() } }
  const kinds = ['all', ...Object.keys(KINDS).filter((k) => all.some((x) => x.kind === k))]

  return (
    <>
      <h2>Site videos</h2>
      <p className="lede">Walkthroughs, drone flights and time-lapses, newest first. Chapters split a long walkthrough into floors and zones, so you can go straight to the part you need.</p>
      <div className="kpis">
        <Kpi v={all.length} k="Videos" />
        {Object.entries(KINDS).map(([k, n]) => <Kpi key={k} v={all.filter((x) => x.kind === k).length} k={n + 's'} />)}
      </div>
      <div className="split">
        <div className="panel">
          {!cur ? (
            <div className="ph media-ph">No videos yet. Add them to <code>public/media/videos</code> and list them in <code>src/data/media.js</code>.</div>
          ) : (
            <>
              <video key={cur.file} ref={ref} className="player" src={mediaUrl(cur.file) + '#t=0.1'} poster={cur.poster && mediaUrl(cur.poster)} controls playsInline preload="metadata"
                onTimeUpdate={(e) => setT(e.target.currentTime)} onLoadedMetadata={(e) => { setDur(e.target.duration); setT(0) }} />
              <div style={{ marginTop: 10 }}>
                <b>{cur.title}</b> <span className="pill idle">{KINDS[cur.kind] || 'Video'}</span>
                <div className="empty">{fmtDate(cur.date)}{at ? ` · now showing ${at.label}` : ''}</div>
              </div>
              {chapters.length > 0 && (
                <>
                  {dur > 0 && (
                    <div className="chapbar" aria-hidden="true">
                      {chapters.map((c, i) => {
                        const end = chapters[i + 1]?.t ?? dur
                        return <button key={i} tabIndex={-1} title={c.label} className={at === c ? 'on' : ''} style={{ width: ((end - c.t) / dur) * 100 + '%' }} onClick={() => seek(c.t)} />
                      })}
                    </div>
                  )}
                  <ul className="zlist" style={{ marginTop: 10 }}>
                    {chapters.map((c, i) => (
                      <li key={i} className={at === c ? 'hl' : ''}>
                        <button className="link" onClick={() => seek(c.t)}>{c.label}</button>
                        <b>{mmss(c.t)}</b>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
        <div className="panel">
          {all.length > 0 && (
            <>
              <div className="seg" role="group" aria-label="Video type" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                {kinds.map((k) => <button key={k} aria-pressed={kind === k} onClick={() => { setKind(k); setSel(0) }}>{k === 'all' ? 'All' : KINDS[k]}</button>)}
              </div>
              <ul className="zlist vlist">
                {list.map((x, i) => (
                  <li key={x.file} className={x === cur ? 'hl' : ''} onClick={() => setSel(i)}>
                    <span><button className="link" onClick={() => setSel(i)}>{x.title}</button><small>{KINDS[x.kind] || 'Video'}{x.chapters?.length ? `, ${x.chapters.length} chapters` : ''}</small></span>
                    <b>{fmtDate(x.date)}</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  )
}
