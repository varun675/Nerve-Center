import { useState } from 'react'
import { allCells, currentVal } from '../data/model'
import { useStore } from '../state/store.jsx'
import EvidenceImage from '../components/EvidenceImage.jsx'

function Card({ c }) {
  const { st, dispatch, can } = useStore()
  const [val, setVal] = useState(c.obs)
  const rk = c.key + '|' + st.W
  const r = st.reviewed[rk]
  const [f, pid] = c.key.split('-')
  const correct = () => {
    if (!can('submit', f)) return dispatch({ type: 'toast', msg: `Your role or floor scope doesn't allow changes to floor ${f}.`, bad: true })
    const v = Math.max(0, Math.min(100, parseInt(val, 10) || 0))
    const cur = currentVal(st, f, pid, st.W, 'obs')
    if (v === cur) return dispatch({ type: 'toast', msg: 'That is the same as the detected value. Use Accept instead.', bad: true })
    dispatch({
      type: 'submit', reviewKey: rk,
      payload: { key: c.key, f: +f, pid, week: st.W, field: 'obs', val: v, why: `Correction from the review queue: the model detected ${cur}% with low confidence, reviewer measured ${v}%.` },
    })
  }
  return (
    <div className="qcard">
      <b>F{c.f} {c.p.name}</b>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Model says {c.obs}% with {r ? '—' : Math.round(c.conf * 100) + '%'} confidence</div>
      <div className="ev"><EvidenceImage c={c} /></div>
      {r ? (
        <div className="done">
          {r === 'accepted' ? `Accepted at ${c.obs}%` : c.manual ? `Corrected to ${c.obs}%, approved` : `Correction to ${r.submitted}% waiting for approval`}
        </div>
      ) : (
        <div className="row">
          <button className="btn primary" onClick={() => dispatch({ type: 'confirm', key: c.key, obs: c.obs })}>Accept {c.obs}%</button>
          <span style={{ fontSize: 13 }}>or correct to</span>
          <input type="number" min="0" max="100" value={val} aria-label="Corrected percentage" onChange={(e) => setVal(e.target.value)} />
          <button className="btn" onClick={correct}>Send for approval</button>
        </div>
      )}
    </div>
  )
}

export default function ReviewQueue() {
  const { st } = useStore()
  const q = allCells(st, st.W).filter((c) => c.needsReview || st.reviewed[c.key + '|' + st.W])
  return (
    <>
      <h2>Low-confidence detections</h2>
      <p className="lede">When the model is less than 82% sure, a person confirms the figure or proposes a correction. Confirmations are logged, and corrections go to a manager for approval like any other manual change.</p>
      <div className="queue">
        {q.map((c) => <Card key={c.key + st.W} c={c} />)}
        {!q.length && <p className="empty">No detections need review this week.</p>}
      </div>
    </>
  )
}
