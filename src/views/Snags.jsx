import { useState } from 'react'
import { PROJECT, SEED_SNAGS } from '../data/aars'
import { fmtDay, resolveRef } from '../data/progress'
import { storePhoto, useActor, useCollection, useNames, usePlatform } from '../platform'
import { Kpi } from '../components/ui.jsx'
import { Lightbox, useLightbox } from '../components/Evidence.jsx'
import { useStore } from '../state/store.jsx'

export const SEV = { high: { t: 'High', c: '#B63A2E', k: 'bad' }, medium: { t: 'Medium', c: '#A8700A', k: 'watch' }, low: { t: 'Low', c: '#5D6A6E', k: 'idle' } }
const TRADES = ['Safety', 'Structure', 'Masonry', 'Electrical', 'Plumbing', 'HVAC', 'Finishes', 'Facade', 'Housekeeping']
const today = () => new Date().toISOString().slice(0, 10)

/** The snag's picture: a published evidence ref, or a photo taken in the app. */
const snagPhoto = (s) => (s.photoSrc ? { type: 'photo', src: s.photoSrc, label: s.title, date: s.createdAt, ref: s.id } : resolveRef(s.photo))

export function SnagForm({ pin, actor, api, onDone, photoRef }) {
  const p = usePlatform()
  const { dispatch } = useStore()
  const [f, setF] = useState({ title: '', sev: 'medium', trade: 'Facade', owner: '', where: pin?.where || '' })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e.preventDefault()
    if (!f.title.trim()) return dispatch({ type: 'toast', msg: 'Describe the snag in a few words.', bad: true })
    setBusy(true)
    try {
      const photo = file ? await storePhoto(p.assets, file) : null
      await api.set(null, { ...f, title: f.title.trim(), status: 'open', pin: pin || null, photo: photoRef || null, photoSrc: photo?.src || null, by: actor.id, createdAt: today() })
      dispatch({ type: 'toast', msg: 'Snag added.' })
      onDone?.()
    } catch (err) {
      dispatch({ type: 'toast', msg: `Couldn't save the snag (${err.code || err.message}).`, bad: true })
    } finally { setBusy(false) }
  }
  return (
    <form className="form" onSubmit={save}>
      <label className="full">What's wrong<input id="snag-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Crack in parapet moulding" /></label>
      <label>Severity<select id="snag-sev" value={f.sev} onChange={(e) => setF({ ...f, sev: e.target.value })}>{Object.entries(SEV).map(([k, v]) => <option key={k} value={k}>{v.t}</option>)}</select></label>
      <label>Trade<select id="snag-trade" value={f.trade} onChange={(e) => setF({ ...f, trade: e.target.value })}>{TRADES.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label>Where<input id="snag-where" value={f.where} onChange={(e) => setF({ ...f, where: e.target.value })} /></label>
      <label>Who fixes it<input id="snag-owner" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} placeholder="Contractor or name" /></label>
      {!photoRef && <label className="full">Photo (optional)<input id="snag-photo" type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files[0] || null)} /></label>}
      <div className="full tools" style={{ marginBottom: 0 }}>
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Add snag'}</button>
        {onDone && <button type="button" className="btn" onClick={onDone}>Cancel</button>}
      </div>
    </form>
  )
}

function CloseSnag({ s, api, actor, onDone }) {
  const p = usePlatform()
  const { dispatch } = useStore()
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const close = async () => {
    if (!file) return dispatch({ type: 'toast', msg: 'Add a photo showing the fix before closing.', bad: true })
    setBusy(true)
    try {
      const ph = await storePhoto(p.assets, file)
      await api.update(s.id, { status: 'closed', closedAt: today(), closedBy: actor.id, closePhotoSrc: ph.src })
      dispatch({ type: 'toast', msg: 'Snag closed with photo proof.' })
      onDone()
    } catch (err) {
      dispatch({ type: 'toast', msg: `Couldn't close the snag (${err.code || err.message}).`, bad: true })
    } finally { setBusy(false) }
  }
  return (
    <div className="form" style={{ marginTop: 8 }}>
      <label className="full">Photo of the fix<input id={'close-' + s.id} type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files[0] || null)} /></label>
      <div className="full tools" style={{ marginBottom: 0 }}>
        <button className="btn primary" disabled={busy} onClick={close}>{busy ? 'Saving…' : 'Close snag'}</button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  )
}

export default function Snags() {
  const actor = useActor()
  const [snags, api, status] = useCollection('snags', SEED_SNAGS)
  const names = useNames(snags.flatMap((s) => [s.by, s.closedBy]))
  const [filter, setFilter] = useState('open')
  const [adding, setAdding] = useState(false)
  const [closing, setClosing] = useState(null)
  const [box, open, close] = useLightbox()
  const list = snags
    .filter((s) => filter === 'all' || (filter === 'open' ? s.status !== 'closed' : s.status === 'closed'))
    .sort((a, b) => (a.status === b.status ? ['high', 'medium', 'low'].indexOf(a.sev) - ['high', 'medium', 'low'].indexOf(b.sev) : a.status === 'closed' ? 1 : -1))
  const openN = snags.filter((s) => s.status !== 'closed')

  return (
    <>
      <h2>Snags and site issues</h2>
      <p className="lede">Defects, safety issues and housekeeping, each with a photo, an owner and a location. A snag closes only with a photo of the fix. Place snags on the facade from the Elevation progress tab.</p>
      <div className="kpis">
        <Kpi v={openN.length} k="Open snags" color="var(--bad)" />
        <Kpi v={openN.filter((s) => s.sev === 'high').length} k="High severity" />
        <Kpi v={snags.filter((s) => s.status === 'closed').length} k="Closed with photo proof" />
        <Kpi v={openN.length ? Math.max(...openN.map((s) => Math.round((new Date(PROJECT.today) - new Date(s.createdAt)) / 864e5))) + ' days' : '—'} k="Oldest open snag" />
      </div>
      <div className="tools">
        <div className="seg" role="group" aria-label="Show">
          {[['open', 'Open'], ['closed', 'Closed'], ['all', 'All']].map(([k, t]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{t}</button>)}
        </div>
        <button className="btn primary" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : 'Add a snag'}</button>
        {status === 'local' && <span className="src-note" style={{ margin: 0 }}>Saved in this browser only. On the shared link, snags are shared with the team.</span>}
      </div>
      {adding && <div className="panel" style={{ marginBottom: 16 }}><SnagForm actor={actor} api={api} onDone={() => setAdding(false)} /></div>}
      <div className="snaglist">
        {list.map((s) => {
          const ph = snagPhoto(s)
          return (
            <article key={s.id} className="panel snag" style={{ borderLeftColor: SEV[s.sev].c }}>
              <div className="snag-ph">
                {ph && <button onClick={() => open(ph)} aria-label="Open photo"><img src={ph.src} alt="" loading="lazy" /></button>}
                {s.closePhotoSrc && <button onClick={() => open({ type: 'photo', src: s.closePhotoSrc, label: 'Fix: ' + s.title, date: s.closedAt })} aria-label="Open photo of the fix"><img src={s.closePhotoSrc} alt="" /><span className="play">Fixed</span></button>}
              </div>
              <div style={{ minWidth: 0 }}>
                <b>{s.title}</b>
                <div className="snag-meta">
                  <span className={'pill ' + SEV[s.sev].k}>{SEV[s.sev].t}</span>
                  <span className={'pill ' + (s.status === 'closed' ? 'ok' : 'idle')}>{s.status === 'closed' ? 'Closed' : 'Open'}</span>
                  <span>{s.trade}</span>
                  {s.where && <span>· {s.where}</span>}
                </div>
                <div className="empty">
                  Raised {fmtDay(s.createdAt)}{s.by ? ` by ${names[s.by] || 'photo review'}` : ' in the photo review'}
                  {s.owner ? ` · owner: ${s.owner}` : ''}
                  {s.status === 'closed' ? ` · closed ${fmtDay(s.closedAt)}${s.closedBy ? ' by ' + (names[s.closedBy] || 'Someone') : ''}` : ''}
                </div>
                {closing === s.id
                  ? <CloseSnag s={s} api={api} actor={actor} onDone={() => setClosing(null)} />
                  : (
                    <div className="tools" style={{ marginTop: 8, marginBottom: 0 }}>
                      {s.status !== 'closed'
                        ? <button className="btn" onClick={() => setClosing(s.id)}>Close with photo</button>
                        : <button className="btn" onClick={() => api.update(s.id, { status: 'open', closedAt: null, closedBy: null })}>Reopen</button>}
                    </div>
                  )}
              </div>
            </article>
          )
        })}
        {!list.length && <p className="empty">No snags here.</p>}
      </div>
      <Lightbox item={box} onClose={close} />
    </>
  )
}
