import { useEffect, useRef, useState } from 'react'
import { ENGINEERS, allCells, stamp } from '../data/model'
import { useStore } from '../state/store.jsx'
import EvidenceImage from '../components/EvidenceImage.jsx'

export default function FieldLoop() {
  const { st, dispatch } = useStore()
  const W = st.W
  const cells = allCells(st, W)
  const target = cells.filter((c) => c.flagged).sort((a, b) => b.gap - a.gap)[0] || cells.find((c) => c.status === 'behind') || null
  const [step, setStep] = useState(0)
  const [msgs, setMsgs] = useState([])
  const chatRef = useRef(null)
  const timer = useRef(null)
  const tkey = target ? target.key : ''

  useEffect(() => { setStep(0); setMsgs([]); clearTimeout(timer.current) }, [W, tkey])
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = 1e6 }, [msgs])

  const at = (m) => { const d = stamp(W, 5, 18, m); return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }
  const already = target && st.actions[target.key]
  const effStep = already ? 3 : step

  const send = () => {
    const c = target
    setStep(1)
    setMsgs([{ dir: 'out', m: 2, body: <><b>Progress mismatch, Tower B F{c.f}</b><br />{c.p.name}: contractor reported {c.reported}%, site captures show {c.obs}%.<br />Please check and reply with a photo and recovery plan.</> }])
    timer.current = setTimeout(() => {
      setMsgs((x) => [...x, { dir: 'in', m: 19, body: <>Checked on site. Captures are right, we're at about {c.obs}%. Short by two {c.p.id === 'mep' ? 'electrician' : 'mason'} gangs since last week.<div className="ph"><EvidenceImage c={c} /></div>Two extra gangs start Monday. Expect to close the gap in 5 working days.</> }])
      setStep(2)
    }, 1300)
  }
  const record = () => {
    dispatch({ type: 'action', key: target.key, text: `Two extra gangs from Monday, gap to close in 5 working days (${ENGINEERS[target.f]}).` })
    setMsgs((x) => [...x, { dir: 'out', m: 21, body: <>Thanks, recovery plan recorded against this work package. We'll check progress on the next walkthrough.</> }])
    setStep(3)
  }
  const reset = () => { if (target) dispatch({ type: 'clearAction', key: target.key }); setStep(0); setMsgs([]) }

  return (
    <>
      <h2>From alert to action on site</h2>
      <p className="lede">A flagged gap goes straight to the responsible site engineer on WhatsApp. Their reply and photo come back into the platform and are attached to the work package.</p>
      <div className="split">
        <div>
          <div className="phone" aria-label="WhatsApp conversation preview">
            <div className="bar2">Nerve Center Alerts<small>{target ? `To ${ENGINEERS[target.f]}, site engineer, floor ${target.f}` : 'No active alert'}</small></div>
            <div className="chat" ref={chatRef} aria-live="polite">
              {msgs.map((x, i) => <div key={i} className={'msg ' + x.dir}>{x.body}<time>{at(x.m)}</time></div>)}
            </div>
          </div>
        </div>
        <div className="panel">
          <h3>Walk through the loop</h3>
          <ol className="steps">
            <li className={effStep >= 1 ? 'did' : ''}>
              <b>Send the alert</b>
              <p>{target ? `Floor ${target.f} ${target.p.name}: reported ${target.reported}%, observed ${target.obs}%. The alert goes to ${ENGINEERS[target.f]}.` : `No flagged items in week ${W}. Move to week 5 or later to try the loop.`}</p>
              <button className="btn primary" disabled={!target || effStep > 0} onClick={send}>Send alert</button>
            </li>
            <li className={effStep >= 2 ? 'did' : ''}><b>Site engineer replies</b><p>The engineer checks on site and replies with a photo and a recovery plan.</p></li>
            <li className={effStep >= 3 ? 'did' : ''}>
              <b>Record the action</b>
              <p>The reply is saved against the work package and the alert moves to "action agreed".</p>
              <button className="btn" disabled={effStep !== 2} onClick={record}>Record action</button>
            </li>
          </ol>
          {effStep === 3 && <p className="empty">{already ? `Action recorded for this item: ${already}` : 'Recorded.'}</p>}
          <button className="link" style={{ marginTop: 12 }} onClick={reset}>Restart the walkthrough</button>
        </div>
      </div>
    </>
  )
}
