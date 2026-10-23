import { useMemo, useState } from 'react'
import { BAYS3, REAL_FLOORS, REAL_ZONES, ZORDER, ZST } from '../data/plan'
import { REAL } from '../data/realData'
import { ExtLink } from '../components/ui.jsx'

const shortFloor = (fl) => fl.replace('Level ', 'L').replace('Ground', 'G')

function useUploadGrid(grid, zones) {
  return useMemo(() => {
    const { floors: F, bays: B, top: t, bottom, left: l, right } = grid
    const b = Math.max(bottom, t + 10), r = Math.max(right, l + 10)
    const floors = Array.from({ length: F }, (_, i) => (i === F - 1 ? 'Ground' : 'Level ' + (F - 1 - i)))
    const bays = Array.from({ length: B }, (_, i) => (B === 3 ? BAYS3[i] : 'Bay ' + (i + 1)))
    const out = []
    floors.forEach((fl, i) => bays.forEach((bn, j) => {
      const k = fl + '|' + j
      const def = i >= F - 1 - Math.floor(F / 3) ? 'done' : i === 0 ? 'next' : 'prog'
      const st = zones[k] || def
      out.push({
        k, fl, bay: j, bayName: bn, st, pct: st === 'done' ? 100 : st === 'prog' ? 50 : 0, wk: '', what: 'Planned works',
        r: [l + ((r - l) * j) / B, t + ((b - t) * i) / F, l + ((r - l) * (j + 1)) / B, t + ((b - t) * (i + 1)) / F],
      })
    }))
    return { floors, bays, zones: out, pctUnits: true }
  }, [grid, zones])
}

const GRID_CONTROLS = [
  ['floors', 'Floors', 1, 8], ['bays', 'Bays', 1, 6],
  ['top', 'Building top edge', 0, 60], ['bottom', 'Building bottom edge', 40, 100],
  ['left', 'Left edge', 0, 50], ['right', 'Right edge', 50, 100],
]

export default function PlanCapture() {
  const [src, setSrc] = useState('real')
  const [hz, setHz] = useState(null)
  const [upImg, setUpImg] = useState(null)
  const [upZones, setUpZones] = useState({})
  const [grid, setGrid] = useState({ floors: 3, bays: 3, top: 5, bottom: 70, left: 3, right: 95 })
  const photo = REAL.gallery.find((g) => g.id === '006463')
  const upModel = useUploadGrid(grid, upZones)
  const realModel = useMemo(() => ({
    floors: REAL_FLOORS, bays: BAYS3, pctUnits: false,
    zones: REAL_ZONES.map((z, i) => ({ ...z, k: 'r' + i, bayName: BAYS3[z.bay] })),
  }), [])
  const M = src === 'real' ? realModel : upModel

  let W0, H0, img
  if (src === 'real') { W0 = photo.w; H0 = photo.h; img = photo.src }
  else if (upImg) { W0 = 100; H0 = (100 * upImg.h) / upImg.w; img = upImg.src }
  const sy = src === 'real' ? 1 : H0 / 100
  const sw = src === 'real' ? 2 : 0.4
  const fs = src === 'real' ? 11 : 2.2

  const cycle = (k) => {
    if (src !== 'upload') return
    const cur = M.zones.find((z) => z.k === k).st
    setUpZones({ ...upZones, [k]: ZORDER[(ZORDER.indexOf(cur) + 1) % 4] })
  }
  const onFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      const im = new Image()
      im.onload = () => { setUpImg({ src: rd.result, w: im.naturalWidth, h: im.naturalHeight }); setUpZones({}) }
      im.src = rd.result
    }
    rd.readAsDataURL(f)
  }
  const hov = { onMouseLeave: () => setHz(null) }
  const zoneLabel = (z) => (z.st === 'prog' && !M.pctUnits ? z.pct + '%' : ZST[z.st].t)

  const B = M.bays.length, F = M.floors.length
  const cw = Math.min(120, 420 / B), ch = Math.min(54, 300 / F), L = 70, T = 8
  const cnt = (s) => M.zones.filter((z) => z.st === s).length
  const overall = Math.round(M.zones.reduce((a, z) => a + z.pct, 0) / M.zones.length)
  const upcoming = M.zones.filter((z) => z.st === 'next' || z.st === 'prog').sort((a, b) => ZORDER.indexOf(b.st) - ZORDER.indexOf(a.st))
  const later = M.zones.filter((z) => z.st === 'later')

  const item = (z) => (
    <li key={z.k} className={hz === z.k ? 'hl' : ''} onMouseEnter={() => setHz(z.k)}>
      <span><span className="zsw" style={{ background: ZST[z.st].c }} />{z.fl}, {z.bayName}<small>{z.what}{z.wk ? ', ' + z.wk : ''}</small></span>
      <b>{zoneLabel(z)}</b>
    </li>
  )

  return (
    <>
      <h2>Plan against capture</h2>
      <p className="lede">The building plan is laid over a real site photo, so everyone can see what's finished, what's underway and which part of the structure is next. Hover over a zone in either view to find it in the other.</p>
      <div className="seg" role="group" aria-label="Choose capture" style={{ marginBottom: 14, width: 'max-content' }}>
        <button aria-pressed={src === 'real'} onClick={() => { setSrc('real'); setHz(null) }}>Real site photo<small>Masonry building</small></button>
        <button aria-pressed={src === 'upload'} onClick={() => { setSrc('upload'); setHz(null) }}>Your own photo<small>Upload and map</small></button>
      </div>
      <div className="split">
        <div className="panel">
          {src === 'upload' && (
            <>
              <div className="form" style={{ marginBottom: 12 }}>
                <label className="full">Site photo<input type="file" accept="image/*" onChange={onFile} /></label>
                {GRID_CONTROLS.map(([k, text, min, max]) => (
                  <label key={k}>{text}<input type="range" min={min} max={max} value={grid[k]} onChange={(e) => setGrid({ ...grid, [k]: +e.target.value })} /></label>
                ))}
              </div>
              <p className="src-note" style={{ marginTop: 0 }}>Line the grid up with the building, then click a zone to change its status. The photo stays in your browser and isn't uploaded anywhere.</p>
            </>
          )}
          <div className="stage" {...hov}>
            {img ? (
              <>
                <img src={img} alt="Building under construction with plan zones overlaid" />
                <svg viewBox={`0 0 ${W0} ${H0}`} preserveAspectRatio="none">
                  {M.zones.filter((z) => z.r).map((z) => {
                    const [x1, y1, x2, y2] = [z.r[0], z.r[1] * sy, z.r[2], z.r[3] * sy]
                    const c = ZST[z.st].c, on = hz === z.k
                    return (
                      <g key={z.k} className="z" onMouseEnter={() => setHz(z.k)} onClick={() => cycle(z.k)}>
                        <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill={c} fillOpacity={on ? 0.55 : z.st === 'next' ? 0.12 : 0.3}
                          stroke={c} strokeWidth={on ? sw * 2 : sw} strokeDasharray={z.st === 'next' ? `${sw * 4} ${sw * 2}` : undefined} />
                        <text x={x1 + sw * 2} y={y1 + fs * 1.3} fontSize={fs} fontWeight="700" fontFamily="Barlow, Arial, sans-serif" fill="#fff" stroke="#000" strokeWidth={fs / 6} paintOrder="stroke">
                          {shortFloor(z.fl)} {z.bayName.split(' ')[0]}: {z.st === 'prog' && !M.pctUnits ? z.pct + '%' : z.st === 'done' ? 'Done' : ZST[z.st].t}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </>
            ) : <div className="ph">Choose a photo of a building under construction.<br />Any real site photo works.</div>}
          </div>
          <div className="legend">
            {ZORDER.slice().reverse().map((s) => <span key={s}><i style={{ background: ZST[s].c }} />{ZST[s].t}</span>)}
          </div>
          {src === 'real' && (
            <p className="src-note">
              Photo: real construction site from the <ExtLink href="https://universe.roboflow.com/roboflow-universe-projects/construction-site-safety/dataset/28">Construction Site Safety dataset</ExtLink> (Roboflow Universe, CC BY 4.0).
              The roof is above the frame and not visible yet. Plan zones were placed by hand for this Project. In production they come from aligning the building model with the camera position.
            </p>
          )}
        </div>
        <div className="panel">
          <h3>As planned</h3>
          <svg viewBox={`0 0 ${L + B * cw + 10} ${T + F * ch + 24}`} role="img" aria-label="As-planned elevation with status of each zone" {...hov}>
            {M.floors.map((fl, i) => (
              <g key={fl}>
                <text x={L - 8} y={T + i * ch + ch / 2 + 4} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--ink)">{fl}</text>
                {M.bays.map((bn, j) => {
                  const z = M.zones.find((q) => q.fl === fl && q.bay === j)
                  if (!z) return null
                  const c = ZST[z.st].c, on = hz === z.k
                  return (
                    <g key={j} style={{ cursor: 'pointer' }} onMouseEnter={() => setHz(z.k)} onClick={() => cycle(z.k)}>
                      <rect x={L + j * cw + 2} y={T + i * ch + 2} width={cw - 4} height={ch - 4} rx="3" fill={c}
                        fillOpacity={z.st === 'next' ? 0.15 : on ? 0.9 : 0.65} stroke={on ? 'var(--ink)' : c} strokeWidth={on ? 2.5 : 1.5}
                        strokeDasharray={z.st === 'next' ? '6 3' : undefined} />
                      <text x={L + j * cw + cw / 2} y={T + i * ch + ch / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">
                        {z.st === 'done' ? '✓' : z.st === 'prog' ? (M.pctUnits ? 'Now' : z.pct + '%') : z.st === 'next' ? 'Next' : ''}
                      </text>
                    </g>
                  )
                })}
              </g>
            ))}
            {M.bays.map((bn, j) => <text key={bn} x={L + j * cw + cw / 2} y={T + F * ch + 16} textAnchor="middle" fontSize="11.5" fill="var(--muted)">{bn}</text>)}
            <line x1={L - 4} x2={L + B * cw + 4} y1={T + F * ch} y2={T + F * ch} stroke="var(--muted)" strokeWidth="2" />
          </svg>
          <div className="counts" style={{ marginTop: 14 }}>
            <div><b>{overall}%</b><span>Structure complete, by zone</span></div>
            <div><b>{cnt('done')} of {M.zones.length}</b><span>Zones completed</span></div>
            <div><b>{cnt('prog')}</b><span>Zones in progress</span></div>
            <div><b>{cnt('next')}</b><span>Zones starting next</span></div>
          </div>
        </div>
      </div>
      <div className="grid2" style={{ marginTop: 20 }}>
        <div className="panel">
          <h3>Work completed</h3>
          <ul className="zlist" {...hov}>
            {M.zones.filter((z) => z.st === 'done').map((z) => item(z))}
            {cnt('done') === 0 && <li className="empty">Nothing completed yet.</li>}
          </ul>
        </div>
        <div className="panel">
          <h3>Planned next</h3>
          <ul className="zlist" {...hov}>
            {upcoming.map((z) => item(z))}
            {later.length > 0 && (
              <li>
                <span><span className="zsw" style={{ background: ZST.later.c }} />After that<small>{[...new Set(later.map((z) => `${z.fl}, ${z.what.toLowerCase()}`))].join('; ')}</small></span>
                <b>{later[0].wk}</b>
              </li>
            )}
            {!upcoming.length && !later.length && <li className="empty">Nothing planned.</li>}
          </ul>
        </div>
      </div>
    </>
  )
}
