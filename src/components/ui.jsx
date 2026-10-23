// Small shared presentational pieces.

export const Kpi = ({ v, small, k, color }) => (
  <div className="kpi">
    <div className="v" style={color ? { color } : undefined}>{v}{small && <> <small>{small}</small></>}</div>
    <div className="k">{k}</div>
  </div>
)

export const Pill = ({ kind, children }) => <span className={'pill ' + kind}>{children}</span>

export const Bar = ({ label, value, color, right }) => (
  <div className="cmp">
    <div className="l"><span>{label}</span><span>{right ?? value + '%'}</span></div>
    <div className="b"><i style={{ width: Math.min(100, value) + '%', background: color }} /></div>
  </div>
)

export const Meter = ({ v, trained }) => (
  <div className="meter">
    <span className="tr"><i className={trained ? 'ft' : ''} style={{ width: Math.round(v * 100) + '%' }} /></span>
    <b>{Math.round(v * 100)}%</b>
  </div>
)

export const Pipeline = ({ steps, style }) => (
  <div className="pipe" style={style}>
    {steps.map(([title, text], i) => (
      <div key={title}><b><span>{i + 1}</span>{title}</b><p>{text}</p></div>
    ))}
  </div>
)

export const ExtLink = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
