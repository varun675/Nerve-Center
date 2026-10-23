import { useEffect, useRef, useState } from 'react'
import { fmtDay } from '../data/progress'

/** Thumbnails for evidence items ({ref, type, src, t, label, date, assumed?}). */
export function EvidenceStrip({ items, open, size }) {
  if (!items?.length) return null
  return (
    <div className="evid">
      {items.map((e, i) => (
        <button key={e.ref + i} onClick={() => open(e)} title={`${e.label}, ${fmtDay(e.date)}`} style={size ? { width: size, height: size * 1.33 } : undefined}>
          {e.type === 'photo' ? <img src={e.src} alt="" loading="lazy" /> : <video src={e.src + '#t=' + (e.t || 0.1)} muted preload="metadata" />}
          {e.type === 'video' && <span className="play">▶ {e.t}s</span>}
          {e.assumed && <span className="asm">Location to confirm</span>}
        </button>
      ))}
    </div>
  )
}

/** Full-screen view of one evidence item. Esc or a click outside closes it. */
export function Lightbox({ item, onClose, children }) {
  useEffect(() => {
    if (!item) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [item, onClose])
  if (!item) return null
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-label={item.label}>
      <div onClick={(e) => e.stopPropagation()}>
        {item.pano ? <Pano src={item.src} /> : item.type === 'photo' ? <img src={item.src} alt={item.label} /> : <video src={item.src + '#t=' + (item.t || 0)} controls autoPlay playsInline />}
        <p><b>{item.label}</b> · {fmtDay(item.date)}{item.assumed ? ' · location to confirm' : ''}</p>
        <div className="tools" style={{ justifyContent: 'center', marginBottom: 0 }}>
          {children}
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/** Hook for a lightbox: [item, open, close]. */
export function useLightbox() {
  const [item, setItem] = useState(null)
  return [item, setItem, () => setItem(null)]
}

/**
 * 360° photo viewer for equirectangular images (Insta360, Ricoh Theta and
 * phone panoramas). Drag or use the arrow keys to look around.
 */
export function Pano({ src, height = 420 }) {
  const ref = useRef(null)
  const [x, setX] = useState(0)
  const drag = useRef(null)
  const onDown = (e) => { drag.current = { x0: e.clientX, start: x }; ref.current.setPointerCapture(e.pointerId) }
  const onMove = (e) => { if (drag.current) setX(drag.current.start + (e.clientX - drag.current.x0)) }
  return (
    <div ref={ref} className="pano" tabIndex={0} role="img" aria-label="360° photo, drag to look around"
      style={{ height, backgroundImage: `url(${src})`, backgroundPositionX: x + 'px' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => (drag.current = null)}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') setX(x + 60); if (e.key === 'ArrowRight') setX(x - 60) }}>
      <span className="tag l">360° · drag to look around</span>
    </div>
  )
}
