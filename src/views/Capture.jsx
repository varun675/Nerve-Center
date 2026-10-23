import { useEffect, useRef, useState } from 'react'
import { SPOTS, zoneById, tradeById } from '../data/aars'
import { fmtDay, resolveRef } from '../data/progress'
import { storePhoto, useActor, useCollection, usePlatform } from '../platform'
import { useStore } from '../state/store.jsx'
import { Compare } from './Photos.jsx'

const today = () => new Date().toISOString().slice(0, 10)

/** Last photo for a spot, or the reference evidence the spot was set up from. */
function refFor(spot, caps) {
  const mine = caps.filter((c) => c.spotId === spot.id).sort((a, b) => (a.date + a.at).localeCompare(b.date + b.at))
  const last = mine[mine.length - 1]
  if (last) return { type: 'photo', src: last.src, date: last.date, label: 'Last capture' }
  return resolveRef(spot.ref)
}

/** The reference shown faintly over the camera or the new photo. */
function Ghost({ refItem, opacity }) {
  if (!refItem) return null
  const style = { opacity }
  return refItem.type === 'video'
    ? <video className="ghost" src={refItem.src + '#t=' + refItem.t} muted playsInline preload="auto" style={style} />
    : <img className="ghost" src={refItem.src} alt="" style={style} />
}

function Shoot({ spot, refItem, onSaved, onCancel }) {
  const p = usePlatform()
  const actor = useActor()
  const { dispatch } = useStore()
  const [, api] = useCollection('captures')
  const video = useRef(null)
  const [stream, setStream] = useState(null)
  const [camFailed, setCamFailed] = useState(false)
  const [shot, setShot] = useState(null) // { file, url }
  const [op, setOp] = useState(40)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let s
    if (!navigator.mediaDevices?.getUserMedia) { setCamFailed(true); return }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false })
      .then((st) => { s = st; setStream(st); if (video.current) video.current.srcObject = st })
      .catch(() => setCamFailed(true))
    return () => s?.getTracks().forEach((t) => t.stop())
  }, [])
  useEffect(() => { if (video.current && stream) video.current.srcObject = stream }, [stream, shot])

  const snap = () => {
    const v = video.current
    const c = document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    c.toBlob((b) => setShot({ file: new File([b], spot.id + '.jpg', { type: 'image/jpeg' }), url: URL.createObjectURL(b) }), 'image/jpeg', 0.9)
  }
  const pick = (e) => { const f = e.target.files[0]; if (f) setShot({ file: f, url: URL.createObjectURL(f) }) }
  const save = async () => {
    setBusy(true)
    try {
      const ph = await storePhoto(p.assets, shot.file)
      const id = await api.set(null, { spotId: spot.id, spotName: spot.name, zone: spot.zone || null, trade: spot.trade || null, date: today(), at: new Date().toISOString(), src: ph.src, assetId: ph.assetId || null, by: actor.id, ai: 'pending' })
      dispatch({ type: 'toast', msg: `Saved. It's in the AI review queue for tagging.` })
      onSaved(id)
    } catch (err) {
      dispatch({ type: 'toast', msg: `Couldn't save the photo (${err.code || err.message}).`, bad: true })
    } finally { setBusy(false) }
  }

  return (
    <div className="panel">
      <h3>{spot.name}</h3>
      <p style={{ marginTop: 0 }}>{spot.where}</p>
      <div className="viewfinder">
        {shot ? <img src={shot.url} alt="New photo" /> : stream ? <video ref={video} autoPlay playsInline muted /> : (
          <div className="media-ph" style={{ color: '#ccc' }}>
            {camFailed ? <>Opens your phone camera instead.<br />Line up with the reference below after taking the photo.</> : 'Starting camera…'}
          </div>
        )}
        {(shot || stream) && <Ghost refItem={refItem} opacity={op / 100} />}
      </div>
      <div className="form" style={{ marginTop: 10 }}>
        {refItem && <label>Reference overlay<input type="range" min="0" max="80" value={op} onChange={(e) => setOp(+e.target.value)} /></label>}
        {!shot && camFailed && <label>Take the photo<input id={'shoot-' + spot.id} type="file" accept="image/*" capture="environment" onChange={pick} /></label>}
      </div>
      {!shot && camFailed && refItem && (
        <div className="viewfinder small" style={{ marginTop: 10 }}>
          {refItem.type === 'video' ? <video src={refItem.src + '#t=' + refItem.t} muted preload="metadata" /> : <img src={refItem.src} alt="Reference" />}
          <span className="tag l">Match this view · {fmtDay(refItem.date)}</span>
        </div>
      )}
      <div className="tools" style={{ marginTop: 10, marginBottom: 0 }}>
        {!shot && stream && <button className="btn primary" onClick={snap}>Take photo</button>}
        {shot && <button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save photo'}</button>}
        {shot && <button className="btn" onClick={() => setShot(null)}>Retake</button>}
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
      {!p.shared && <p className="src-note">Photos taken here are kept in this browser. On the shared link they're saved for the whole team.</p>}
    </div>
  )
}

export default function Capture() {
  const [caps] = useCollection('captures')
  const [active, setActive] = useState(null)
  const [cmp, setCmp] = useState(null)
  const spot = SPOTS.find((s) => s.id === active)
  const week = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)
  const doneThisWeek = SPOTS.filter((s) => caps.some((c) => c.spotId === s.id && c.date >= week)).length

  return (
    <>
      <h2>Weekly photo capture</h2>
      <p className="lede">Eight fixed spots, shot from the same place every week. The camera shows last time's photo faintly on top so the new one lines up, which gives true before-and-after pairs and a time-lapse for each spot. Every photo goes to AI review for tagging.</p>
      <div className="capbar">
        <b>{doneThisWeek} of {SPOTS.length}</b> spots captured in the last 7 days
        <span className="meter"><span className="tr"><i style={{ width: (doneThisWeek / SPOTS.length) * 100 + '%' }} /></span></span>
      </div>
      {spot && <Shoot key={spot.id} spot={spot} refItem={refFor(spot, caps)} onSaved={() => setActive(null)} onCancel={() => setActive(null)} />}
      <div className="spots" style={{ marginTop: spot ? 20 : 0 }}>
        {SPOTS.map((s) => {
          const r = refFor(s, caps)
          const mine = caps.filter((c) => c.spotId === s.id).sort((a, b) => a.date.localeCompare(b.date))
          const fresh = mine.some((c) => c.date >= week)
          const first = resolveRef(s.ref) || (mine[0] && { src: mine[0].src, date: mine[0].date, type: 'photo' })
          const last = mine[mine.length - 1]
          return (
            <article key={s.id} className="panel spot">
              <div className="spot-ph">
                {r ? (r.type === 'video' ? <video src={r.src + '#t=' + r.t} muted preload="metadata" /> : <img src={r.src} alt="" loading="lazy" />) : <div className="media-ph">No reference yet</div>}
                <span className={'pill ' + (fresh ? 'ok' : 'watch')}>{fresh ? 'Done this week' : 'Due'}</span>
              </div>
              <b>{s.name}</b>
              <small className="empty">{s.zone ? zoneById(s.zone).name : tradeById(s.trade).name} · {mine.length} capture{mine.length === 1 ? '' : 's'}{last ? `, last ${fmtDay(last.date)}` : ''}</small>
              <div className="tools" style={{ marginTop: 8, marginBottom: 0 }}>
                <button className="btn primary" onClick={() => { setActive(s.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Capture</button>
                {first && last && first.type === 'photo' && <button className="btn" onClick={() => setCmp(cmp === s.id ? null : s.id)}>Before and after</button>}
              </div>
              {cmp === s.id && first && last && <div style={{ marginTop: 10 }}><Compare a={{ file: first.src, date: first.date, view: s.name }} b={{ file: last.src, date: last.date, view: s.name }} /></div>}
            </article>
          )
        })}
      </div>
    </>
  )
}
