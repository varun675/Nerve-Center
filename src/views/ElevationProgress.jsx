import { useMemo, useRef, useState } from 'react'
import { ELEVATIONS as DRAWINGS, mediaUrl } from '../data/media'
import { ELEVATIONS, FACADE_STAGES, PROJECT, SIDES, ZONES } from '../data/aars'
import { fmtDay, useProgress } from '../data/progress'
import { useActor, useCollection } from '../platform'
import { Kpi } from '../components/ui.jsx'
import { EvidenceStrip, Lightbox, useLightbox } from '../components/Evidence.jsx'
import { SnagForm, SEV } from './Snags.jsx'

const PAGE_W = 1000, PAGE_H = 707

// Darker green = further along; amber outline = work happening now.
const fill = (s) => (s.key === 'none' ? 'url(#hatch)' : `rgba(46,122,78,${0.18 + (s.pct / 100) * 0.7})`)

export default function ElevationProgress() {
  const P = useProgress()
  const actor = useActor()
  const [snags, snagApi] = useCollection('snags')
  const [side, setSide] = useState('front')
  const [sel, setSel] = useState(null)
  const [box, open, close] = useLightbox()
  const dates = P.evidenceDates.filter((d) => d <= PROJECT.today)
  const [di, setDi] = useState(null)
  const at = di == null ? PROJECT.today : dates[di]
  const [pinMode, setPinMode] = useState(false)
  const [newPin, setNewPin] = useState(null)
  const svgRef = useRef(null)

  const drawing = DRAWINGS.find((d) => d.file.includes(side))
  const E = ELEVATIONS[side]
  const state = (z) => P.zoneState(z.id, at)
  const zone = E.zones.find((z) => z.id === sel) || E.zones.find((z) => state(z).ev.length) || E.zones[0]
  const zs = state(zone)
  const missing = ZONES.filter((z) => !P.zoneState(z.id).ev.length)
  const assumed = ZONES.filter((z) => P.zoneState(z.id).ev.some((o) => o.assumed))
  const sidePct = (s) => Math.round(ELEVATIONS[s].zones.reduce((a, z) => a + P.zoneState(z.id, at).pct, 0) / ELEVATIONS[s].zones.length)
  const [cx, cy, cw, ch] = E.crop
  const pins = snags.filter((s) => s.pin?.side === side && s.status !== 'closed')
  const ev = useMemo(() => {
    const seen = new Set()
    return zs.ev.filter((o) => !seen.has(o.ref) && seen.add(o.ref)).map((o) => ({ ...P.resolve(o.ref), assumed: o.assumed })).filter((e) => e.src)
  }, [zs, P])

  const onDrawingClick = (e) => {
    if (!pinMode) return
    const pt = svgRef.current.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const p = pt.matrixTransform(svgRef.current.getScreenCTM().inverse())
    const z = E.zones.find((q) => p.x >= q.r[0] && p.x <= q.r[2] && p.y >= q.r[1] && p.y <= q.r[3])
    setNewPin({ side, x: Math.round(p.x), y: Math.round(p.y), zone: z?.id, where: z ? `${z.name}, ${SIDES.find((s) => s[0] === side)[1].toLowerCase()} elevation` : `${SIDES.find((s) => s[0] === side)[1]} elevation` })
    setPinMode(false)
  }

  return (
    <>
      <h2>{PROJECT.name}, progress against elevation</h2>
      <p className="lede">Each part of the facade is coloured by how far it has got, based on dated site photos and videos. Select a zone to see its stage and the evidence behind it. Grey hatching means no photo shows that part yet. Drag the date slider to replay progress.</p>
      <div className="kpis">
        <Kpi v={P.facadePct(at) + '%'} k={`Facade, as of ${fmtDay(at)}`} />
        <Kpi v={P.interiorPct(at) + '%'} k="Interior works" />
        <Kpi v={`${ZONES.length - missing.length} of ${ZONES.length}`} k="Facade zones backed by evidence" />
        <Kpi v={snags.filter((s) => s.status !== 'closed').length} k="Open snags" color="var(--bad)" />
      </div>

      <div className="tools">
        <div className="seg" role="group" aria-label="Elevation">
          {SIDES.map(([id, t]) => (
            <button key={id} aria-pressed={side === id} onClick={() => { setSide(id); setSel(null) }}>{t}<small>{sidePct(id)}% complete</small></button>
          ))}
        </div>
        <label className="chk asof">As of
          <input type="range" min="0" max={dates.length - 1} value={di ?? dates.length - 1} onChange={(e) => setDi(+e.target.value === dates.length - 1 ? null : +e.target.value)} aria-label="Show progress as of date" />
          <b>{fmtDay(at)}</b>
        </label>
      </div>

      <div className="split">
        <div className="panel">
          <div className={'elev' + (pinMode ? ' pinning' : '')}>
            <svg ref={svgRef} viewBox={`${cx} ${cy} ${cw} ${ch}`} role="img" aria-label={`${drawing.title} with progress zones`} onClick={onDrawingClick}>
              <defs>
                <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="8" height="8" fill="rgba(120,130,130,.12)" /><line x1="0" y1="0" x2="0" y2="8" stroke="rgba(90,100,100,.55)" strokeWidth="2" />
                </pattern>
              </defs>
              <image href={mediaUrl(drawing.image)} x="0" y="0" width={PAGE_W} height={PAGE_H} />
              {E.zones.map((z) => {
                const s = state(z), on = zone.id === z.id
                const [x1, y1, x2, y2] = z.r
                return (
                  <g key={z.id} className="z" onClick={() => !pinMode && setSel(z.id)} role="button" aria-label={`${z.name}: ${s.text}`}>
                    <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill={fill(s)}
                      stroke={on ? '#1C272B' : s.key === 'prog' ? '#E0A841' : s.key === 'none' ? '#7A8585' : '#2E7A4E'}
                      strokeWidth={on ? 3 : 1.6} strokeDasharray={s.key === 'none' ? '5 3' : undefined} />
                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 4} textAnchor="middle" fontSize={Math.min(13, (y2 - y1) * 0.6)} fontWeight="700"
                      fontFamily="Barlow, Arial, sans-serif" fill="#fff" stroke="#000" strokeWidth="2.5" paintOrder="stroke">
                      {s.key === 'none' ? '?' : s.pct + '%'}
                    </text>
                  </g>
                )
              })}
              {[...pins, ...(newPin && newPin.side === side ? [{ id: 'new', pin: newPin, sev: 'medium', title: 'New snag' }] : [])].map((s) => (
                <g key={s.id} className="pin" transform={`translate(${s.pin.x} ${s.pin.y})`}>
                  <title>{s.title}</title>
                  <path d="M0 0 C-7 -10 -7 -18 0 -20 C7 -18 7 -10 0 0Z" fill={SEV[s.sev].c} stroke="#fff" strokeWidth="1.5" />
                  <circle cy="-13" r="3" fill="#fff" />
                </g>
              ))}
            </svg>
          </div>
          <div className="legend">
            <span><i style={{ background: 'rgba(46,122,78,.3)' }} />Early stage</span>
            <span><i style={{ background: 'rgba(46,122,78,.85)' }} />Nearly finished</span>
            <span><i style={{ background: 'transparent', border: '2px solid #E0A841' }} />Work underway</span>
            <span><i style={{ background: 'repeating-linear-gradient(45deg,#8a9494 0 2px,transparent 2px 5px)' }} />No evidence yet</span>
            <span><i style={{ background: '#B63A2E', borderRadius: '50% 50% 50% 0' }} />Snag</span>
          </div>
          <div className="tools" style={{ marginTop: 10, marginBottom: 0 }}>
            <button className={'btn' + (pinMode ? ' primary' : '')} onClick={() => { setPinMode(!pinMode); setNewPin(null) }}>{pinMode ? 'Click the drawing to place the snag…' : 'Add a snag on the drawing'}</button>
            <span className="src-note" style={{ margin: 0 }}>{drawing.title}, issued {fmtDay(drawing.date)}. <a href={mediaUrl(drawing.file)} target="_blank" rel="noopener noreferrer">Open the PDF</a></span>
          </div>
          {newPin && (
            <div className="panel inset" style={{ marginTop: 12 }}>
              <h3>New snag at {newPin.where}</h3>
              <SnagForm pin={newPin} actor={actor} api={snagApi} onDone={() => setNewPin(null)} />
            </div>
          )}
        </div>

        <div className="panel">
          <h3>{zone.name}</h3>
          <ol className="stages">
            {FACADE_STAGES.map((st, i) => {
              const k = !zs.ev.length ? 'unk' : i < zs.done ? 'done' : i === zs.active ? 'prog' : 'todo'
              return <li key={st} className={k}><i />{st}<small>{{ done: 'Complete', prog: 'In progress', todo: 'Not started', unk: 'Unknown' }[k]}</small></li>
            })}
          </ol>
          {zs.ev.length ? (
            <>
              <p style={{ margin: '12px 0 6px' }}><b>{zs.text}</b>, {zs.pct}% of facade stages</p>
              <EvidenceStrip items={ev} open={open} />
            </>
          ) : (
            <div className="alert warn" style={{ marginTop: 12 }}>
              <b>No photo or video shows this part yet</b>
              <p>Take one photo of the {zone.name.toLowerCase()} from the {SIDES.find((s) => s[0] === side)[1].toLowerCase()} of the building, standing far enough back to get the whole zone in frame. The Capture tab has fixed spots for this.</p>
            </div>
          )}
          {snags.filter((s) => s.pin?.zone === zone.id && s.status !== 'closed').map((s) => (
            <div key={s.id} className="alert" style={{ marginTop: 10, borderColor: SEV[s.sev].c }}><b>Snag: {s.title}</b><p>{SEV[s.sev].t} · {s.trade}</p></div>
          ))}
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 20 }}>
        <div className="panel">
          <h3>Photos still needed</h3>
          <p className="empty" style={{ marginTop: 0 }}>Facade zones with no evidence. One photo of each fills in the picture.</p>
          <ul className="zlist">
            {missing.map((z) => (
              <li key={z.id}><button className="link" onClick={() => { setSide(z.side); setSel(z.id) }}>{z.name}</button><b>{SIDES.find((s) => s[0] === z.side)[1]}</b></li>
            ))}
            {!missing.length && <li className="empty">Every zone has evidence.</li>}
          </ul>
        </div>
        <div className="panel">
          <h3>Locations to confirm</h3>
          <p className="empty" style={{ marginTop: 0 }}>Evidence was found, but which side of the building it shows needs checking on site.</p>
          <ul className="zlist">
            {assumed.map((z) => (
              <li key={z.id}><button className="link" onClick={() => { setSide(z.side); setSel(z.id) }}>{z.name}</button><b>{SIDES.find((s) => s[0] === z.side)[1]}</b></li>
            ))}
            {!assumed.length && <li className="empty">Nothing to confirm.</li>}
          </ul>
        </div>
      </div>
      <Lightbox item={box} onClose={close} />
    </>
  )
}
