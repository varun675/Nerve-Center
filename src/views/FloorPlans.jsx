import { useState } from 'react'
import { FLOOR_PLANS } from '../data/aars'
import { mediaUrl } from '../data/media'
import { useProgress } from '../data/progress'
import { useCollection } from '../platform'
import { EvidenceStrip, Lightbox, useLightbox } from '../components/Evidence.jsx'

export default function FloorPlans() {
  const P = useProgress()
  const [obs] = useCollection('observations')
  const [pi, setPi] = useState(0)
  const [room, setRoom] = useState(null)
  const [box, open, close] = useLightbox()
  const plan = FLOOR_PLANS[pi]

  if (!plan) {
    return (
      <>
        <h2>Floor plans</h2>
        <p className="lede">Most site photos are taken inside, so floor plans are where interior progress belongs: each photo pinned to its room, and each room coloured by how much evidence it has.</p>
        <div className="panel">
          <h3>Waiting for the plan drawings</h3>
          <p>Send the ground floor, first floor and terrace plans for AARS 057 (PDF from the architect is fine). Once they're in:</p>
          <ul>
            <li>Rooms are marked on each plan, the same way zones are on the elevations.</li>
            <li>AI review suggests the room for every interior photo, and the fixed capture spots get pins.</li>
            <li>This tab shows each room with its latest photo and which trades it has evidence for.</li>
          </ul>
        </div>
      </>
    )
  }

  const inRoom = (id) => obs.filter((o) => o.room === id && !o.rejected)
  const sel = plan.rooms.find((r) => r.id === room)
  const ev = sel ? inRoom(sel.id).map((o) => P.resolve(o.ref)).filter(Boolean) : []
  return (
    <>
      <h2>Floor plans</h2>
      <p className="lede">Interior photos pinned to rooms. Darker rooms have more evidence. Select a room to see its photos.</p>
      {FLOOR_PLANS.length > 1 && (
        <div className="seg" role="group" aria-label="Floor" style={{ marginBottom: 14, width: 'max-content' }}>
          {FLOOR_PLANS.map((p, i) => <button key={p.id} aria-pressed={pi === i} onClick={() => { setPi(i); setRoom(null) }}>{p.title}</button>)}
        </div>
      )}
      <div className="split">
        <div className="panel">
          <div className="elev" style={{ position: 'relative' }}>
            <img src={mediaUrl(plan.image)} alt={plan.title} style={{ width: '100%', display: 'block' }} />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              {plan.rooms.map((r) => {
                const n = inRoom(r.id).length
                return <rect key={r.id} x={r.r[0]} y={r.r[1]} width={r.r[2] - r.r[0]} height={r.r[3] - r.r[1]} fill={n ? `rgba(31,95,191,${Math.min(0.6, 0.15 + n * 0.1)})` : 'url(#hatch)'} stroke={room === r.id ? '#1C272B' : '#1F5FBF'} strokeWidth="0.4" style={{ cursor: 'pointer' }} onClick={() => setRoom(r.id)} />
              })}
            </svg>
          </div>
        </div>
        <div className="panel">
          <h3>{sel ? sel.name : 'Rooms'}</h3>
          {sel ? (ev.length ? <EvidenceStrip items={ev} open={open} /> : <p className="empty">No photos pinned to this room yet.</p>) : (
            <ul className="zlist">{plan.rooms.map((r) => <li key={r.id}><button className="link" onClick={() => setRoom(r.id)}>{r.name}</button><b>{inRoom(r.id).length} photos</b></li>)}</ul>
          )}
        </div>
      </div>
      <Lightbox item={box} onClose={close} />
    </>
  )
}
