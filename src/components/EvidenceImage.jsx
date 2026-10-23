// Illustrated capture for : draws the work package at its
// detected completion, with a detection box and confidence label.
const W0 = 320
const H0 = 200
const FONT = 'Barlow, Arial, sans-serif'

function Bricks({ fullCourses, part, courses }) {
  const out = []
  const bw = 26, bh = 14
  for (let i = 0; i < courses; i++) {
    const y = 178 - (i + 1) * bh
    if (y < 22) break
    const built = i < fullCourses ? 260 : i === fullCourses ? 260 * part : 0
    for (let x = 0; x < built; x += bw) {
      const xx = 26 + x + (i % 2) * 13
      if (xx >= 294) continue
      out.push(<rect key={i + '-' + x} x={xx} y={y} width={Math.min(bw - 2, 294 - xx - 1)} height={bh - 2} fill="#B9764E" stroke="#8E5436" strokeWidth=".6" />)
    }
  }
  return out
}

export default function EvidenceImage({ c }) {
  const pct = c.obs
  const id = c.p.id
  const name = c.p.name
  let body = null
  let box = { x: 30, y: 26, w: 260, h: 150 }
  const courses = Math.ceil(150 / 14)

  if (id === 'block' || id === 'plaster') {
    const pw = (268 * pct) / 100
    body = (
      <>
        <Bricks courses={courses} fullCourses={id === 'plaster' ? courses : Math.floor((courses * pct) / 100)} part={id === 'plaster' ? 0 : ((courses * pct) / 100) % 1} />
        {id === 'plaster' && <rect x="26" y="22" width={pw} height="156" fill="#DAD6CF" />}
        {id === 'plaster' && pw > 4 && <path d={`M${26 + pw} 22 q-6 40 0 78 q6 40 0 78`} fill="none" stroke="#C3BEB5" strokeWidth="3" />}
      </>
    )
    if (id === 'block') { const hh = Math.min(152, (152 * pct) / 100); box = { x: 28, y: 178 - hh, w: 264, h: Math.max(hh, 4) } }
    else box = { x: 26, y: 24, w: Math.max(pw, 4), h: 152 }
  } else if (id === 'slab') {
    const cw = (320 * pct) / 100
    body = (
      <>
        <rect width="320" height="200" fill="#A9B8C2" />
        {Array.from({ length: 11 }, (_, i) => <rect key={i} x={10 + i * 30} y="110" width="4" height="90" fill="#8A6A45" />)}
        <rect x="0" y="100" width="320" height="12" fill="#A57F52" />
        {Array.from({ length: 27 }, (_, i) => <line key={i} x1={i * 12} y1="84" x2={i * 12} y2="100" stroke="#4E5557" />)}
        <rect x="0" y="82" width={cw} height="20" fill="#8C8F8E" />
        {pct > 0 && pct < 100 && <path d={`M${cw + 10} 40 Q ${cw + 40} 10 ${cw + 80} 30 L 330 30`} stroke="#2F3436" strokeWidth="7" fill="none" />}
      </>
    )
    box = { x: 2, y: 78, w: Math.max(cw - 4, 4), h: 28 }
  } else {
    const done = Math.round((9 * pct) / 100)
    const maxX = done ? 44 + (done - 1) * 28 + 12 : 30
    body = (
      <>
        <rect x="26" y="22" width="268" height="156" fill="#B98A6A" />
        {Array.from({ length: 11 }, (_, i) => <line key={i} x1="26" y1={22 + i * 14} x2="294" y2={22 + i * 14} stroke="#9E7254" />)}
        {Array.from({ length: done }, (_, i) => {
          const x = 44 + i * 28, y = 120 + (i % 3) * 14
          return <g key={i}><line x1={x} y1="22" x2={x} y2={y} stroke="#E8CB3C" strokeWidth="5" /><rect x={x - 8} y={y} width="16" height="14" fill="#D9D9D9" stroke="#777" /></g>
        })}
      </>
    )
    box = { x: 30, y: 24, w: Math.max(maxX - 30, 4), h: 140 }
  }

  const conf = Math.round(c.conf * 100)
  const col = c.conf < 0.82 ? '#F2C14E' : '#3CE08A'
  const lt = `${name} ${pct}%  ·  conf ${conf}%`
  const lw = lt.length * 6.1 + 10
  const ly = Math.max(box.y - 2, 16)
  const lx = Math.min(box.x, W0 - lw)

  return (
    <svg viewBox={`0 0 ${W0} ${H0}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`site capture: ${name} on floor ${c.f}, ${pct}% detected`}>
      <rect width={W0} height={H0} fill="#9AA5A8" />
      <rect width={W0} height="22" fill="#6F7A7D" />
      <rect y="178" width={W0} height="22" fill="#7C8588" />
      <rect y="22" width="26" height="156" fill="#B4BBBD" />
      <rect x="294" y="22" width="26" height="156" fill="#B4BBBD" />
      {body}
      {pct > 0 ? (
        <>
          <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke={col} strokeWidth="2" strokeDasharray="6 4" />
          <rect x={lx} y={ly - 14} width={lw} height="15" fill={col} />
          <text x={lx + 5} y={ly - 3} fontSize="10.5" fontFamily={FONT} fontWeight="600" fill="#102015">{lt}</text>
        </>
      ) : (
        <text x="160" y="104" textAnchor="middle" fontSize="14" fontFamily={FONT} fill="#1C272B">No {name.toLowerCase()} detected</text>
      )}
      <rect x={W0 - 86} y={H0 - 20} width="82" height="16" rx="3" fill="rgba(0,0,0,.55)" />
      <text x={W0 - 45} y={H0 - 8} textAnchor="middle" fontSize="10" fontFamily={FONT} fill="#fff">360° frame · F{c.f}</text>
    </svg>
  )
}
