import { useEffect, useMemo, useState } from 'react'
import { FACADE_STAGES, PROJECT, SIDES, TRADES, ZONES, zoneById, tradeById } from '../data/aars'
import { PHOTOS, mediaUrl } from '../data/media'
import { fmtDay } from '../data/progress'
import { toBlob, useActor, useCollection, useNames, usePlatform } from '../platform'
import { useStore } from '../state/store.jsx'
import { Kpi } from '../components/ui.jsx'
import { Lightbox, useLightbox } from '../components/Evidence.jsx'

const docId = (ref) => ref.replace(':', '~')
const sideName = (s) => SIDES.find((x) => x[0] === s)[1]

const PROMPT = `You are tagging a construction progress photo for ${PROJECT.name}, a ${PROJECT.kind.toLowerCase()} in India (brick infill on an RCC frame; facade gets plaster, mouldings, columns, railings and a dome).

Decide what the photo shows and reply with ONLY a JSON object:
{"kind":"facade"|"interior"|"unclear","zone":<zone id or null>,"stage":<0-4 or null>,"trade":<trade id or null>,"status":"done"|"prog","confidence":<0 to 1>,"summary":"<one plain sentence>","issues":[{"title":"<short>","sev":"high"|"medium"|"low","trade":"<Safety|Structure|Masonry|Electrical|Plumbing|HVAC|Finishes|Facade|Housekeeping>"}]}

Facade zones (only when the photo shows the outside of the building): ${ZONES.map((z) => `${z.id} = ${z.name}, ${sideName(z.side).toLowerCase()} elevation`).join('; ')}.
Facade stages: ${FACADE_STAGES.map((s, i) => `${i} = ${s}`).join(', ')}.
Interior trades (inside the building): ${TRADES.map((t) => `${t.id} = ${t.name}`).join('; ')}.
"status" is "done" when that stage or trade looks finished in view, else "prog". Only list real, visible issues (safety, quality defects, housekeeping); an empty array is fine. Lower the confidence when the zone or side can't be told from the photo.`

function Suggestion({ s, onChange }) {
  const kind = s.kind === 'facade' ? 'facade' : s.kind === 'interior' ? 'interior' : 'unclear'
  return (
    <div className="form" style={{ marginTop: 8 }}>
      <label>Shows
        <select value={kind} onChange={(e) => onChange({ ...s, kind: e.target.value })}>
          <option value="facade">Facade</option><option value="interior">Interior</option><option value="unclear">Can't tell</option>
        </select>
      </label>
      {kind === 'facade' && <>
        <label>Zone<select value={s.zone || ''} onChange={(e) => onChange({ ...s, zone: e.target.value })}><option value="">Choose…</option>{ZONES.map((z) => <option key={z.id} value={z.id}>{sideName(z.side)}: {z.name}</option>)}</select></label>
        <label>Stage<select value={s.stage ?? ''} onChange={(e) => onChange({ ...s, stage: +e.target.value })}>{FACADE_STAGES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select></label>
      </>}
      {kind === 'interior' && <label>Trade<select value={s.trade || ''} onChange={(e) => onChange({ ...s, trade: e.target.value })}><option value="">Choose…</option>{TRADES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
      {kind !== 'unclear' && <label>Status<select value={s.status || 'prog'} onChange={(e) => onChange({ ...s, status: e.target.value })}><option value="prog">In progress</option><option value="done">Complete</option></select></label>}
    </div>
  )
}

export default function AiReview() {
  const p = usePlatform()
  const actor = useActor()
  const { dispatch } = useStore()
  const [caps] = useCollection('captures')
  const [tags, tagApi] = useCollection('aiTags')
  const [, obsApi] = useCollection('observations')
  const [, snagApi] = useCollection('snags')
  const names = useNames(tags.map((t) => t.reviewedBy))
  const [imgOk, setImgOk] = useState(null)
  const [busy, setBusy] = useState({})
  const [edit, setEdit] = useState({})
  const [show, setShow] = useState('queue')
  const [box, open, close] = useLightbox()

  useEffect(() => { if (p.sample) p.sample.limits().then((l) => setImgOk(!!l.images)).catch(() => setImgOk(false)); else if (p.ready) setImgOk(false) }, [p.sample, p.ready])

  const items = useMemo(() => [
    ...caps.map((c) => ({ ref: 'cap:' + c.id, src: c.src, date: c.date, label: c.spotName || 'Site capture', hint: c.zone ? `Spot: ${zoneById(c.zone).name}` : c.trade ? `Spot: ${tradeById(c.trade).name}` : '' })),
    ...PHOTOS.map((x) => ({ ref: x.id || x.file.replace(/^photos\//, '').replace(/\.jpg$/, ''), src: mediaUrl(x.file), date: x.date, label: x.note || x.view, hint: `Tagged by hand as ${x.view}` })),
  ].map((it) => ({ ...it, tag: tags.find((t) => t.id === docId(it.ref)) })), [caps, tags])
  const queue = items.filter((i) => !i.tag || i.tag.status === 'suggested')
  const reviewed = items.filter((i) => i.tag && i.tag.status !== 'suggested')
  const list = show === 'queue' ? queue : reviewed

  const suggest = async (it) => {
    setBusy((b) => ({ ...b, [it.ref]: 'Looking at the photo…' }))
    try {
      const img = await toBlob(it.src)
      const s = await p.sample.json(PROMPT + (it.hint ? `\n\nContext from the site team: ${it.hint}.` : ''), { images: [img], modelTier: 'default' })
      const clean = { kind: s.kind, zone: ZONES.some((z) => z.id === s.zone) ? s.zone : null, stage: Number.isInteger(s.stage) ? Math.max(0, Math.min(4, s.stage)) : null, trade: TRADES.some((t) => t.id === s.trade) ? s.trade : null, status: s.status === 'done' ? 'done' : 'prog', confidence: Math.max(0, Math.min(1, +s.confidence || 0)), summary: String(s.summary || '').slice(0, 300), issues: (Array.isArray(s.issues) ? s.issues : []).slice(0, 5).map((i) => ({ title: String(i.title).slice(0, 140), sev: ['high', 'medium', 'low'].includes(i.sev) ? i.sev : 'medium', trade: String(i.trade || 'Safety') })) }
      await tagApi.set(docId(it.ref), { ref: it.ref, status: 'suggested', source: 'ai', s: clean, at: new Date().toISOString() })
    } catch (e) {
      const msg = { not_granted: 'AI tagging was not allowed for this page.', rate_limited: 'Too many requests. Try again in a minute.', images_unavailable: "This view can't send photos to Claude.", invalid_json: 'The answer came back in the wrong shape. Try again.' }[e.code] || `AI tagging failed (${e.code || e.message}).`
      dispatch({ type: 'toast', msg, bad: true })
    } finally { setBusy((b) => ({ ...b, [it.ref]: null })) }
  }

  const confirm = async (it, s) => {
    if (s.kind === 'facade' && (!s.zone || s.stage == null)) return dispatch({ type: 'toast', msg: 'Choose the zone and stage first.', bad: true })
    if (s.kind === 'interior' && !s.trade) return dispatch({ type: 'toast', msg: 'Choose the trade first.', bad: true })
    setBusy((b) => ({ ...b, [it.ref]: 'Saving…' }))
    try {
      if (s.kind !== 'unclear') {
        const o = s.kind === 'facade' ? { zone: s.zone, stage: s.stage } : { trade: s.trade }
        await obsApi.set(docId(it.ref) + '-' + (s.zone || s.trade), { ref: it.ref, ...o, status: s.status, date: it.date, by: actor.id, source: it.tag?.source || 'manual' })
      }
      await tagApi.set(docId(it.ref), { ...(it.tag || { ref: it.ref, source: 'manual' }), s, status: s.kind === 'unclear' ? 'rejected' : 'confirmed', reviewedBy: actor.id, reviewedAt: new Date().toISOString() })
      dispatch({ type: 'toast', msg: s.kind === 'unclear' ? 'Marked as not usable for progress.' : 'Confirmed. Progress views are updated.' })
    } catch (e) {
      dispatch({ type: 'toast', msg: `Couldn't save (${e.code || e.message}).`, bad: true })
    } finally { setBusy((b) => ({ ...b, [it.ref]: null })) }
  }

  const raise = async (it, issue) => {
    await snagApi.set(null, { title: issue.title, sev: issue.sev, trade: issue.trade, status: 'open', photo: it.ref.startsWith('cap:') ? null : it.ref, photoSrc: it.ref.startsWith('cap:') ? it.src : null, where: it.label, by: actor.id, createdAt: new Date().toISOString().slice(0, 10), source: 'ai' })
    dispatch({ type: 'toast', msg: 'Snag raised from the AI finding.' })
  }

  return (
    <>
      <h2>AI photo review</h2>
      <p className="lede">Claude looks at each new photo and suggests which part of the building it shows, the stage reached, and any safety or quality issues. A person confirms or corrects every suggestion before it counts toward progress.</p>
      <div className="kpis">
        <Kpi v={queue.length} k="Photos waiting for review" />
        <Kpi v={tags.filter((t) => t.status === 'suggested').length} k="AI suggestions to confirm" />
        <Kpi v={tags.filter((t) => t.status === 'confirmed').length} k="Confirmed and counted" />
        <Kpi v={tags.reduce((a, t) => a + (t.s?.issues?.length || 0), 0)} k="Issues spotted by AI" />
      </div>
      {imgOk === false && (
        <div className="alert warn"><b>AI tagging runs on the shared claude.ai link</b><p>Here you can still tag photos by hand with the same fields. On the shared link, each viewer is asked once to allow the page to use Claude, and the tagging uses their own Claude plan.</p></div>
      )}
      <div className="tools">
        <div className="seg" role="group" aria-label="Show">
          <button aria-pressed={show === 'queue'} onClick={() => setShow('queue')}>To review<small>{queue.length} photos</small></button>
          <button aria-pressed={show === 'done'} onClick={() => setShow('done')}>Reviewed<small>{reviewed.length} photos</small></button>
        </div>
      </div>
      <div className="aiq">
        {list.map((it) => {
          const s = edit[it.ref] || it.tag?.s || { kind: 'unclear', status: 'prog' }
          const low = it.tag?.s && it.tag.s.confidence < 0.7
          return (
            <article key={it.ref} className="panel aiitem">
              <button className="aiimg" onClick={() => open({ type: 'photo', src: it.src, label: it.label, date: it.date })}><img src={it.src} alt="" loading="lazy" /></button>
              <div style={{ minWidth: 0 }}>
                <b>{it.label}</b>
                <div className="empty">{fmtDay(it.date)}{it.hint ? ' · ' + it.hint : ''}</div>
                {it.tag?.s?.summary && <p style={{ margin: '6px 0' }}>{it.tag.s.summary}</p>}
                {it.tag?.s && it.tag.source === 'ai' && (
                  <div className="snag-meta">
                    <span className={'pill ' + (low ? 'watch' : 'ok')}>AI confidence {Math.round(it.tag.s.confidence * 100)}%</span>
                    {low && <span>Needs a closer look</span>}
                    {it.tag.status !== 'suggested' && <span className={'pill ' + (it.tag.status === 'confirmed' ? 'ok' : 'idle')}>{it.tag.status === 'confirmed' ? 'Confirmed' : 'Not used'}{it.tag.reviewedBy ? ' by ' + (names[it.tag.reviewedBy] || 'Someone') : ''}</span>}
                  </div>
                )}
                {show === 'queue' && <Suggestion s={s} onChange={(v) => setEdit({ ...edit, [it.ref]: v })} />}
                {it.tag?.s?.issues?.length > 0 && (
                  <ul className="zlist" style={{ marginTop: 8 }}>
                    {it.tag.s.issues.map((iss, k) => (
                      <li key={k}><span>{iss.title}<small>{iss.trade} · {iss.sev}</small></span><button className="link" onClick={() => raise(it, iss)}>Raise snag</button></li>
                    ))}
                  </ul>
                )}
                {show === 'queue' && (
                  <div className="tools" style={{ marginTop: 8, marginBottom: 0 }}>
                    {p.sample && imgOk && <button className="btn" disabled={!!busy[it.ref]} onClick={() => suggest(it)}>{busy[it.ref] || (it.tag ? 'Ask AI again' : 'Suggest tags with AI')}</button>}
                    <button className="btn primary" disabled={!!busy[it.ref]} onClick={() => confirm(it, s)}>Confirm</button>
                  </div>
                )}
              </div>
            </article>
          )
        })}
        {!list.length && <p className="empty">{show === 'queue' ? 'Nothing waiting. New captures and WhatsApp photos land here.' : 'Nothing reviewed yet.'}</p>}
      </div>
      <Lightbox item={box} onClose={close} />
    </>
  )
}
