import { useState } from 'react'
import { REAL } from '../data/realData'
import { Kpi, ExtLink } from '../components/ui.jsx'

const COL = { Person: '#3B9BFF', helmet: '#39D98A', vest: '#FFC933', gloves: '#E879F9', boots: '#E879F9' }
const LBL = { Person: 'Worker', helmet: 'Helmet', vest: 'Vest', gloves: 'Gloves', boots: 'Boots' }
const TOGGLES = [
  ['Person', 'Workers', { background: '#3B9BFF' }],
  ['helmet', 'Helmets', { background: '#39D98A' }],
  ['vest', 'Safety vests', { background: '#FFC933' }],
  ['gear', 'Gloves and boots', { background: '#E879F9' }],
  ['gt', 'Labelled answer', { border: '2px dashed #fff', background: '#555' }],
]

export default function Vision() {
  const [idx, setIdx] = useState(0)
  const [on, setOn] = useState({ Person: true, helmet: true, vest: true, gear: false, gt: false })
  const [rejected, setRejected] = useState({})
  const g = REAL.gallery[idx]
  const show = (c) => on[c === 'gloves' || c === 'boots' ? 'gear' : c]
  const people = g.det.map((d, i) => ({ d, i })).filter((x) => x.d.c === 'Person')
  const live = people.filter((x) => !rejected[g.id + x.i])
  const t = REAL.totals

  return (
    <>
      <h2>A detection model running on real construction photos</h2>
      <p className="lede">These are real site images from a public dataset. The boxes are the actual output of an open-source detection model we ran on them, not drawings. Turn on "Labelled answer" to compare with what a human annotator marked.</p>
      <div className="split">
        <div className="panel">
          <div className="toggles">
            {TOGGLES.map(([k, text, sw]) => (
              <label key={k}><input type="checkbox" checked={on[k]} onChange={(e) => setOn({ ...on, [k]: e.target.checked })} /><span className="sw" style={sw} />{text}</label>
            ))}
          </div>
          <div className="stage">
            <img src={g.src} alt={`${g.title}, construction site photo`} />
            <svg viewBox={`0 0 ${g.w} ${g.h}`} preserveAspectRatio="none" aria-hidden="true">
              {on.gt && g.gt.map((b, i) => <rect key={'gt' + i} x={b.b[0]} y={b.b[1]} width={b.b[2] - b.b[0]} height={b.b[3] - b.b[1]} fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="7 5" />)}
              {g.det.map((d, i) => {
                if (!show(d.c) || rejected[g.id + i]) return null
                const x = d.b, c = COL[d.c], txt = `${LBL[d.c]} ${Math.round(d.p * 100)}%`, tw = txt.length * 6.6 + 8
                const lx = Math.min(x[0], g.w - tw), ly = Math.max(x[1] - 15, 0)
                return (
                  <g key={i}>
                    <rect x={x[0]} y={x[1]} width={x[2] - x[0]} height={x[3] - x[1]} fill="none" stroke={c} strokeWidth="2.5" />
                    {(d.c === 'Person' || d.c === 'helmet') && <>
                      <rect x={lx} y={ly} width={tw} height="15" fill={c} />
                      <text x={lx + 4} y={ly + 11.5} fontSize="11" fontWeight="600" fontFamily="Barlow, Arial, sans-serif" fill="#0B1620">{txt}</text>
                    </>}
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="thumbs" aria-label="Choose an image">
            {REAL.gallery.map((x, i) => (
              <button key={x.id} aria-pressed={i === idx} aria-label={x.title} onClick={() => setIdx(i)}><img src={x.src} alt="" /></button>
            ))}
          </div>
          <p className="src-note">
            Images: <ExtLink href="https://universe.roboflow.com/roboflow-universe-projects/construction-site-safety/dataset/28">Construction Site Safety dataset</ExtLink> (Roboflow Universe, CC BY 4.0), test split.
            Model: YOLO11n PPE detector from the <ExtLink href="https://github.com/Minhalali7860/Real-Time-PPE-Detection-System">Real-Time-PPE-Detection-System</ExtLink> repository, run with ONNX Runtime on a CPU.
          </p>
        </div>
        <div className="panel">
          <h3>{g.title}</h3>
          {g.id === '006672' && <div className="hint">One "worker" here is actually equipment on the tower. Mark it as wrong below to see how a reviewer corrects the count.</div>}
          <div className="counts">
            <div><b>{live.length}</b><span>Workers detected</span></div>
            <div><b>{g.summary.gt_people}</b><span>Workers in the labelled answer</span></div>
            <div><b>{live.filter((x) => x.d.helmet).length} of {live.length}</b><span>Wearing a helmet</span></div>
            <div><b>{live.filter((x) => x.d.vest).length} of {live.length}</b><span>Wearing a safety vest</span></div>
          </div>
          <h3 style={{ fontSize: 17 }}>Workers found</h3>
          <ul className="dets">
            {people.map((x, n) => {
              const r = rejected[g.id + x.i]
              return (
                <li key={x.i} className={r ? 'rej' : ''}>
                  <span>Worker {n + 1}, {Math.round(x.d.p * 100)}% sure</span>
                  <span className="tags">
                    <span className={'pill ' + (x.d.helmet ? 'ok' : 'bad')}>{x.d.helmet ? 'Helmet' : 'No helmet'}</span>
                    <span className={'pill ' + (x.d.vest ? 'ok' : 'bad')}>{x.d.vest ? 'Vest' : 'No vest'}</span>
                    <button className="link" style={{ marginLeft: 6 }} onClick={() => setRejected({ ...rejected, [g.id + x.i]: !r })}>{r ? 'Undo' : 'Mark as wrong'}</button>
                  </span>
                </li>
              )
            })}
            {!people.length && <li>No workers detected.</li>}
          </ul>
        </div>
      </div>
      <div className="kpis" style={{ marginTop: 20 }}>
        <Kpi v={t.images} k="Real site images processed" />
        <Kpi v={t.people} small={`of ${t.gt_people} labelled`} k="Workers detected" />
        <Kpi v={`${Math.round((t.helmet / t.people) * 100)}%`} k="Detected workers wearing a helmet" />
        <Kpi v={`${Math.round((t.vest / t.people) * 100)}%`} k="Detected workers wearing a vest" />
        <Kpi v={t.ms_per_image} small="ms" k="Per image on a standard CPU, no GPU" />
      </div>
    </>
  )
}
