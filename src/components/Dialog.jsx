import { useEffect, useRef } from 'react'
import { ENGINEERS, capTime, cellByKey, h, statusText, weekDates } from '../data/model'
import { CAUSES, SPRINTS, sprintDates, sprintTasks } from '../data/sprint'
import { useStore } from '../state/store.jsx'
import EvidenceImage from './EvidenceImage.jsx'
import { Bar } from './ui.jsx'

function EvidenceBody({ k }) {
  const { st, dispatch, me, can } = useStore()
  const W = st.W
  const c = cellByKey(st, k, W)
  let verdict
  if (!c.started) verdict = <div className="verdict ok">Not scheduled to start yet.</div>
  else if (c.flagged) verdict = <div className="verdict bad"><b>Report mismatch.</b> The contractor reported {c.reported}%, but the captures show {c.obs}%. The gap is {c.gap} points.</div>
  else if (c.status === 'behind' || c.status === 'watch') verdict = <div className="verdict watch"><b>{statusText[c.status]}.</b> {Math.abs(c.variance)} points behind plan. The contractor report agrees with the evidence.</div>
  else verdict = <div className="verdict ok"><b>On track.</b> Report and evidence agree.</div>
  const manualText = [
    c.ov && c.ov.by === 'manual' ? `Observed value set by ${c.ov.sub}, approved by ${c.ov.appr} (${c.ov.cr}).` : '',
    c.rov ? `Reported value set by ${c.rov.sub}, approved by ${c.rov.appr} (${c.rov.cr}).` : '',
  ].join(' ')
  return (
    <DlgFrame title={`Floor ${c.f}, ${c.p.name}`} sub={`Week ${W}, ${weekDates(W)}`}>
      <div className="dlg-b">
        <div>
          <div className="ev-img"><EvidenceImage c={c} /></div>
          <dl className="meta-list">
            <dt>Captured</dt><dd>{capTime(c, W)}{c.fresh > 72 && <> <span className="pill bad">Older than 72 h</span></>}</dd>
            <dt>Source device</dt><dd>{c.f >= 6 ? 'CAM-360-01' : 'CAM-360-02'}, cross-checked with CCTV-T1</dd>
            <dt>Detection</dt><dd>{c.ov ? (c.ov.by === 'manual' ? 'Manually changed, see below' : 'Confirmed by reviewer') : `Model estimate, confidence ${Math.round(c.conf * 100)}%`}</dd>
            <dt>Evidence ID</dt><dd>EV-B{c.f}-{c.p.id.toUpperCase()}-W{W}-{(h(c.key + W) % 9000) + 1000}</dd>
          </dl>
        </div>
        <div>
          <Bar label="Planned (schedule)" value={c.planned} color="var(--muted)" />
          <Bar label="Reported (contractor)" value={c.reported} color="var(--warn)" />
          <Bar label="Observed (site evidence)" value={c.obs} color="var(--blue)" />
          {verdict}
          {c.manual && <div className="verdict watch" style={{ marginTop: 8 }}><b>Manually changed.</b> {manualText} The device values are kept in the audit trail.</div>}
          {can('submit', c.f)
            ? <button className="btn" style={{ marginTop: 10 }} onClick={() => dispatch({ type: 'correction', prefill: { f: c.f, pid: c.p.id } })}>Request a correction</button>
            : <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>Your role ({me.role}) can't change this figure.</p>}
          {st.actions[c.key] && <div className="verdict ok" style={{ marginTop: 8 }}><b>Action agreed:</b> {st.actions[c.key]}</div>}
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>Forecast finish: week {c.fcFinish.toFixed(1)} (planned {c.planFinish.toFixed(1)}). Site engineer: {ENGINEERS[c.f]}.</p>
        </div>
      </div>
    </DlgFrame>
  )
}

function TaskBody({ k, sp }) {
  const { st } = useStore()
  const s = SPRINTS[sp - 1]
  const t = sprintTasks(st, s).find((x) => x.key === k)
  if (!t) return null
  const c = t.cause && CAUSES[t.cause]
  const fix = st.fixState[t.key + '|' + sp] || 'Open'
  return (
    <DlgFrame title={`F${t.f} ${t.p.name}, Sprint ${sp}`} sub={sprintDates(s)}>
      <div className="dlg-b dlg-wide">
        <div className="ba">
          <figure><div className="ev-img"><EvidenceImage c={t.a} /></div><figcaption>Sprint start (end of week {s.start - 1}): {t.a.obs}% detected</figcaption></figure>
          <figure><div className="ev-img"><EvidenceImage c={t.b} /></div><figcaption>Sprint end (week {s.end}): {t.b.obs}% detected, confidence {Math.round(t.b.conf * 100)}%</figcaption></figure>
        </div>
        <div className="grid2" style={{ gap: 18 }}>
          <div>
            <Bar label="Needed this sprint to reach target" value={t.plan} right={`+${t.plan} pts`} color="var(--muted)" />
            <Bar label="Achieved this sprint" value={t.done} right={`+${t.done} pts`} color="var(--blue)" />
            <div className="crew">
              <div><b>{t.crewPlan}</b>Planned crew</div>
              <div><b style={{ color: t.crewSeen < t.crewPlan * 0.8 ? 'var(--bad)' : 'inherit' }}>{t.crewSeen}</b>Average workers seen in captures</div>
              <div><b>{t.pct}%</b>Sprint completion</div>
            </div>
          </div>
          <div>
            {c ? (
              <>
                <div className={'verdict ' + (t.status === 'Unverified' ? 'watch' : 'bad')}><b>{c.cat}.</b> {c.why}</div>
                <h3 style={{ fontSize: 17, margin: '12px 0 0' }}>Rectification steps</h3>
                <ol className="fixlist">{c.fix.map((f) => <li key={f}>{f}</li>)}</ol>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Owner: {c.owner}. Fix status: {fix}. Due before the week {s.end + 1} capture.</p>
              </>
            ) : <div className="verdict ok"><b>Done to target.</b> No action needed.</div>}
          </div>
        </div>
      </div>
    </DlgFrame>
  )
}

function DlgFrame({ title, sub, children }) {
  const { dispatch } = useStore()
  return (
    <>
      <div className="dlg-h">
        <div><h3 id="dlgTitle" style={{ margin: 0 }}>{title}</h3><small>{sub}</small></div>
        <button className="x" aria-label="Close" onClick={() => dispatch({ type: 'dialog', dialog: null })}>×</button>
      </div>
      {children}
    </>
  )
}

export default function Dialog() {
  const { st, dispatch } = useStore()
  const ref = useRef(null)
  const d = st.dialog
  useEffect(() => {
    const el = ref.current
    if (d && !el.open) el.showModal()
    if (!d && el.open) el.close()
  }, [d])
  const close = () => dispatch({ type: 'dialog', dialog: null })
  return (
    <dialog ref={ref} aria-labelledby="dlgTitle" onClose={close} onClick={(e) => { if (e.target === ref.current) close() }}>
      {d && d.type === 'task' && <TaskBody k={d.key} sp={d.sprint} />}
      {d && d.type === 'evidence' && <EvidenceBody k={d.key} />}
    </dialog>
  )
}
