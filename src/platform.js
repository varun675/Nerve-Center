// Platform adapter. On the hosted claude.ai link the app gets a shared
// database, file storage, Claude and the viewer's identity. Anywhere else
// (npm run dev, a static host) those resolve to null and shared data falls
// back to this browser's storage, so every feature still runs.
import { useEffect, useMemo, useState } from 'react'
import { U } from './data/users'
import { useStore } from './state/store.jsx'

const use = (name) => (typeof window !== 'undefined' && window.claude?.use ? window.claude.use(name).catch(() => null) : Promise.resolve(null))

let caps = null
function loadCaps() {
  if (!caps) {
    caps = Promise.all(['db', 'assets', 'sample', 'user'].map(use)).then(async ([db, assets, sample, user]) => {
      const me = user ? await user.me() : null
      return { db, assets, sample, user, me, shared: !!db }
    })
  }
  return caps
}

/** { ready, db, assets, sample, user, me, shared } — null members mean "not here". */
export function usePlatform() {
  const [p, setP] = useState({ ready: false, shared: false })
  useEffect(() => { let live = true; loadCaps().then((c) => live && setP({ ...c, ready: true })); return () => { live = false } }, [])
  return p
}

/**
 * Who is acting. Hosted: the real viewer (approvers are people who can edit
 * the artifact). Local: the "Signed in as" user from the header.
 */
export function useActor() {
  const p = usePlatform()
  const { st } = useStore()
  return useMemo(() => {
    if (p.me && p.me.id) return { id: p.me.id, name: p.me.name || 'You', canApprove: p.me.canEdit, real: true }
    const u = U(st.meId)
    return { id: u.id, name: u.name, canApprove: u.role === 'Project manager' || u.role === 'Admin', real: false }
  }, [p.me, st.meId])
}

/** Display names for stored ids: real profiles when hosted, demo users locally. */
export function useNames(ids) {
  const p = usePlatform()
  const key = [...new Set(ids.filter(Boolean))].sort().join(',')
  const [names, setNames] = useState({})
  useEffect(() => {
    const list = key ? key.split(',') : []
    if (!p.user) { setNames(Object.fromEntries(list.map((id) => [id, U(id)?.name || 'Someone']))); return }
    p.user.profiles(list).then((ps) => setNames(Object.fromEntries(list.map((id) => [id, ps[id]?.name || 'Someone']))))
  }, [key, p.user])
  return names
}

// ---- Shared collections -------------------------------------------------

const LS = 'aars:'
const localSubs = {}
const readLocal = (name) => { try { return JSON.parse(localStorage.getItem(LS + name)) || {} } catch { return {} } }
const writeLocal = (name, all) => {
  try { localStorage.setItem(LS + name, JSON.stringify(all)) } catch { /* private window: keep in memory only */ }
  mem[name] = all
  ;(localSubs[name] || []).forEach((f) => f(all))
}
const mem = {}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

/**
 * A live collection of documents: [rows, api, status].
 * rows: array of { id, ...data }. `seed` fills an empty LOCAL store only;
 * the hosted database is seeded once by Claude, never from page code.
 */
export function useCollection(name, seed) {
  const p = usePlatform()
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!p.ready) return
    if (p.db) {
      const unsub = p.db.collection(name).onSnapshot(
        (snap) => { setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setStatus('shared') },
        () => setStatus('error'),
      )
      return unsub
    }
    let all = mem[name] || readLocal(name)
    if (!Object.keys(all).length && seed) { all = Object.fromEntries(seed.map((s) => [s.id, s])); writeLocal(name, all) }
    mem[name] = all
    const push = (a) => setRows(Object.entries(a).map(([id, d]) => ({ ...d, id })))
    push(all); setStatus('local')
    ;(localSubs[name] ||= []).push(push)
    return () => { localSubs[name] = localSubs[name].filter((f) => f !== push) }
  }, [p.ready, p.db, name]) // eslint-disable-line react-hooks/exhaustive-deps

  const api = useMemo(() => ({
    async set(id, data) {
      id ||= newId()
      if (p.db) await p.db.collection(name).doc(id).set(data)
      else writeLocal(name, { ...(mem[name] || {}), [id]: data })
      return id
    },
    async update(id, patch) {
      if (p.db) await p.db.collection(name).doc(id).update(patch)
      else writeLocal(name, { ...(mem[name] || {}), [id]: { ...(mem[name] || {})[id], ...patch } })
    },
    async remove(id) {
      if (p.db) await p.db.collection(name).doc(id).delete()
      else { const all = { ...(mem[name] || {}) }; delete all[id]; writeLocal(name, all) }
    },
  }), [p.db, name])

  return [rows, api, status]
}

/**
 * Store a photo. Hosted with edit rights: uploaded to the artifact's file
 * storage (shared). Otherwise: kept as a small data URL in this browser.
 * Resolves { src, assetId? }.
 */
export async function storePhoto(assets, file) {
  if (assets) {
    const r = await assets.upload(file)
    return { src: '/_blob/' + r.id, assetId: r.id }
  }
  return { src: await shrink(file, 1024, 0.72) } // stays under the database's 256 KB per record
}

/** Downscale an image file to a JPEG data URL (keeps local storage small). */
export function shrink(file, max = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

/** Fetch any image the app can show (published file, asset or data URL) as a Blob for Claude. */
export async function toBlob(src) {
  const r = await fetch(src)
  return r.blob()
}
