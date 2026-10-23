import { useMemo, useState } from 'react'
import { FACADE_STAGES, MILESTONES, PROJECT, SIDES, TRADES, ZONES } from '../data/aars'
import { fmtDay, useProgress } from '../data/progress'
import { useCollection, usePlatform } from '../platform'
import { useStore } from '../state/store.jsx'
import { EvidenceStrip, Lightbox, useLightbox } from '../components/Evidence.jsx'

const ST = { done: 'complete', prog: 'in progress', todo: 'not started' }
const sideName = (s) => SIDES.find((x) => x[0] === s)[1].toLowerCase()

export default function ClientReport() {
  const P = useProgress()
  const p = usePlatform()
  const { dispatch } = useStore()
  const [snags] = useCollection('snags')
  const [pays] = useCollection('payments')
  const [box, open, close] = useLightbox()
  const dates = P.evidenceDates.filter((d) => d < PROJECT.today)
  const [from, setFrom] = useState(dates.includes('2026-02-04') ? '2026-02-04' : dates[Math.max(0, dates.length - 2)])
  const to = PROJECT.today
  const [ai, setAi] = useState({ text: '', busy: false })

  const R = useMemo(() => {
    const zoneMoves = ZONES.map((z) => ({ z, a: P.zoneState(z.id, from), b: P.zoneState(z.id, to) })).filter((m) => m.b.pct !== m.a.pct)
    const tradeMoves = TRADES.map((t) => ({ t, a: P.tradeState(t.id, from), b: P.tradeState(t.id, to) })).filter((m) => m.a.status !== m.b.status || m.b.ev.length > m.a.ev.length)
    // Before and after: the last evidence up to `from` against the newest in the period, per trade.
    const pairs = TRADES.map((t) => {
      const ev = P.tradeState(t.id, to).ev.map((o) => P.resolve(o.ref)).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))
      const before = ev.filter((e) => e.date <= from).pop()
      const after = ev.filter((e) => e.date > from).pop()
      return before && after ? { t, before, after } : null
    }).filter(Boolean)
    const nextUp = Object.entries(P.plan).filter(([k, [s, f]]) => P.itemState(k).status !== 'done' && s <= new Date(new Date(to).getTime() + 45 * 864e5).toISOString().slice(0, 10) && f >= to).map(([k, [, f]]) => ({ name: P.itemName(k), f }))
    const opened = snags.filter((s) => s.createdAt > from && s.createdAt <= to)
    const closed = snags.filter((s) => s.closedAt && s.closedAt > from && s.closedAt <= to)
    const openHigh = snags.filter((s) => s.status !== 'closed' && s.sev === 'high')
    const pay = MILESTONES.map((m) => ({ m, met: P.milestoneState(m).met, st: pays.find((x) => x.id === m.id)?.status || 'none' }))
    return { zoneMoves, tradeMoves, pairs, nextUp, opened, closed, openHigh, pay, warn: P.warnings(to).slice(0, 5), fA: P.facadePct(from), fB: P.facadePct(to), iA: P.interiorPct(from), iB: P.interiorPct(to) }
  }, [P, from, to, snags, pays])

  const text = [
    `${PROJECT.name} progress, ${fmtDay(from)} to ${fmtDay(to)}`,
    `Facade ${R.fA}% → ${R.fB}%. Interior ${R.iA}% → ${R.iB}%.`,
    R.tradeMoves.length ? 'Moved: ' + R.tradeMoves.map((m) => `${m.t.name} (${ST[m.b.status]})`).join('; ') + '.' : '',
    R.zoneMoves.length ? 'Facade: ' + R.zoneMoves.map((m) => `${m.z.name}, ${sideName(m.z.side)} — ${m.b.text.toLowerCase()}`).join('; ') + '.' : '',
    R.warn.length ? 'Behind plan: ' + R.warn.map((w) => `${w.name} (${w.days} days)`).join('; ') + '.' : 'Nothing behind plan.',
    R.nextUp.length ? 'Next: ' + R.nextUp.map((n) => n.name).join(', ') + '.' : '',
    `Snags: ${snags.filter((s) => s.status !== 'closed').length} open (${R.openHigh.length} high), ${R.closed.length} closed this period.`,
  ].filter(Boolean).join('\n')

  const copy = async (t) => {
    try { await navigator.clipboard.writeText(t); dispatch({ type: 'toast', msg: 'Copied. Paste it into WhatsApp.' }) } catch {
      const ta = document.getElementById('report-text'); ta?.select(); dispatch({ type: 'toast', msg: 'Select the text below and copy it.' })
    }
  }
  const write = async () => {
    setAi({ text: '', busy: true })
    try {
      const r = await p.sample(`Write a short progress update (under 120 words) for the owner of a house being built. Plain, friendly, specific, no headings, no bullet points, no jargon the owner wouldn't know. Base it only on these facts:\n\n${text}`, { modelTier: 'quick', onText: ({ text: t }) => setAi({ text: t, busy: true }) })
      setAi({ text: r.text, busy: false })
    } catch (e) {
      setAi({ text: e.text || '', busy: false })
      if (e.code !== 'cancelled') dispatch({ type: 'toast', msg: e.code === 'not_granted' ? 'Claude was not allowed for this page.' : `Couldn't write the summary (${e.code}).`, bad: true })
    }
  }

  return (
    <>
      <h2>Client progress report</h2>
      <p className="lede">A one-page update built from the evidence: what moved, before-and-after proof, what's behind plan and what's next. Pick the start of the period; it runs to today.</p>
      <div className="tools">
        <label className="chk">Since<select className="sel" value={from} onChange={(e) => setFrom(e.target.value)}>{dates.map((d) => <option key={d} value={d}>{fmtDay(d)}</option>)}</select></label>
        <button className="btn primary" onClick={() => copy(ai.text || text)}>Copy for WhatsApp</button>
        {p.sample && <button className="btn" disabled={ai.busy} onClick={write}>{ai.busy ? 'Writing…' : 'Write it for the owner with AI'}</button>}
      </div>

      <div className="report panel">
        <header>
          <div><small>Progress report</small><h3>{PROJECT.name}</h3><span className="empty">{PROJECT.kind}</span></div>
          <div className="r-period">{fmtDay(from)} → {fmtDay(to)}</div>
        </header>
        {ai.text && <p className="r-ai">{ai.text}</p>}
        <div className="r-nums">
          <div><b>{R.fA}% → {R.fB}%</b><span>Facade, by zone and stage</span></div>
          <div><b>{R.iA}% → {R.iB}%</b><span>Interior works</span></div>
          <div><b>{R.warn.length}</b><span>Stages behind plan</span></div>
          <div><b>{snags.filter((s) => s.status !== 'closed').length}</b><span>Open snags, {R.openHigh.length} high</span></div>
        </div>

        <h4>What moved</h4>
        <ul className="zlist">
          {R.tradeMoves.map((m) => <li key={m.t.id}><span>{m.t.name}<small>{m.b.ev.length - m.a.ev.length} new photo or video{m.b.ev.length - m.a.ev.length === 1 ? '' : 's'}</small></span><b>{ST[m.a.status]} → {ST[m.b.status]}</b></li>)}
          {R.zoneMoves.map((m) => <li key={m.z.id}><span>{m.z.name}<small>{sideName(m.z.side)} elevation</small></span><b>{m.a.key === 'none' ? 'no evidence' : m.a.text.toLowerCase()} → {m.b.text.toLowerCase()}</b></li>)}
          {!R.tradeMoves.length && !R.zoneMoves.length && <li className="empty">No new evidence in this period.</li>}
        </ul>

        {R.pairs.length > 0 && <>
          <h4>Before and after</h4>
          <div className="pairs">
            {R.pairs.map(({ t, before, after }) => (
              <figure key={t.id}>
                <figcaption><b>{t.name}</b></figcaption>
                <div className="pair">
                  <div><EvidenceStrip items={[before]} open={open} size={110} /><small>{fmtDay(before.date)}</small></div>
                  <div><EvidenceStrip items={[after]} open={open} size={110} /><small>{fmtDay(after.date)}</small></div>
                </div>
              </figure>
            ))}
          </div>
        </>}

        <div className="grid2" style={{ gap: 16 }}>
          <div>
            <h4>Behind plan</h4>
            <ul className="zlist">{R.warn.map((w) => <li key={w.key}><span>{w.name}<small>{w.text}</small></span><b className="gap-bad">{w.days} d</b></li>)}{!R.warn.length && <li className="empty">Nothing.</li>}</ul>
          </div>
          <div>
            <h4>Coming up</h4>
            <ul className="zlist">{R.nextUp.map((n) => <li key={n.name}><span>{n.name}</span><b>by {fmtDay(n.f)}</b></li>)}{!R.nextUp.length && <li className="empty">Nothing scheduled in the next 45 days.</li>}</ul>
          </div>
        </div>

        <h4>Payments</h4>
        <ul className="zlist">
          {R.pay.map(({ m, met, st }) => <li key={m.id}><span>{m.name}<small>{m.pct}% of contract · {met ? 'evidence complete' : 'evidence incomplete'}</small></span><b>{{ none: 'Not requested', requested: 'Awaiting approval', approved: 'Approved', rejected: 'Rejected', paid: 'Paid' }[st]}</b></li>)}
        </ul>
        <p className="src-note">Stages: {FACADE_STAGES.join(' → ')}. Percentages count each facade zone's stages and each interior trade equally. Built {fmtDay(to)} from dated photos and videos.</p>
      </div>

      <h3 style={{ marginTop: 20 }}>Text for WhatsApp</h3>
      <textarea id="report-text" className="reporttext" readOnly value={ai.text ? ai.text + '\n\n' + text : text} rows={9} />
      <Lightbox item={box} onClose={close} />
    </>
  )
}
