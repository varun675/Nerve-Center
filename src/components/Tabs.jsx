import { useEffect, useMemo, useState } from 'react'
import { allCells } from '../data/model'
import { useStore } from '../state/store.jsx'
import { useCollection } from '../platform'
import { useProgress } from '../data/progress'

export const TABS = [
  { id: 'home', label: 'Project home', group: 'aars' },
  { id: 'elev', label: 'Elevation progress', group: 'aars' },
  { id: 'schedule', label: 'Schedule', group: 'aars', count: 'late' },
  { id: 'capture', label: 'Capture', group: 'aars' },
  { id: 'ai', label: 'AI review', group: 'aars', count: 'ai' },
  { id: 'snags', label: 'Snags', group: 'aars', count: 'snags' },
  { id: 'payments', label: 'Payments', group: 'aars' },
  { id: 'client', label: 'Client report', group: 'aars' },
  { id: 'plans', label: 'Floor plans', group: 'aars' },
  { id: 'photos', label: 'Photos', group: 'aars' },
  { id: 'videos', label: 'Videos', group: 'aars' },
  { id: 'devices', label: 'Site devices', group: 'ops' },
  { id: 'sprint', label: 'Sprint review', group: 'ops' },
  { id: 'plan', label: 'Plan vs capture', group: 'ops' },
  { id: 'overview', label: 'Site overview', group: 'ops', week: true },
  { id: 'recon', label: 'Reported vs observed', group: 'ops', week: true, count: 'flag' },
  { id: 'review', label: 'Review queue', group: 'ops', week: true, count: 'review' },
  { id: 'warn', label: 'Early warnings', group: 'ops', week: true },
  { id: 'field', label: 'Site team loop', group: 'ops', week: true },
  { id: 'report', label: 'Weekly report', group: 'ops', week: true },
  { id: 'changes', label: 'Manual changes', group: 'ops', week: true, count: 'changes' },
  { id: 'access', label: 'Access control', group: 'ops' },
  { id: 'vision', label: 'AI on real site photos', group: 'real' },
  { id: 'accuracy', label: 'Model accuracy', group: 'real' },
]

const GROUPS = [['aars', 'AARS 057'], ['ops', 'Sample dashboards (Tower B)'], ['real', 'AI evidence']]

export default function Tabs() {
  const { st, dispatch } = useStore()
  const [tags] = useCollection('aiTags')
  const [snags] = useCollection('snags')
  const P = useProgress()
  const aars = { ai: tags.filter((t) => t.status === 'suggested').length, snags: snags.filter((s) => s.status !== 'closed').length, late: P.warnings().filter((w) => w.level === 'bad').length }
  const counts0 = useMemo(() => {
    const cells = allCells(st, st.W)
    return {
      flag: cells.filter((c) => c.flagged).length,
      review: cells.filter((c) => c.needsReview && !st.reviewed[c.key + '|' + st.W]).length,
      changes: st.changes.filter((c) => c.status === 'Pending').length,
    }
  }, [st])
  const counts = { ...counts0, ...aars }
  const cur = (TABS.find((t) => t.id === st.tab) || TABS[0]).group
  // Remember the last tab opened in each section, so switching back returns to it.
  const [last, setLast] = useState({})
  useEffect(() => setLast((l) => ({ ...l, [cur]: st.tab })), [cur, st.tab])
  const badge = (t) => t.count && counts[t.count] > 0 && <span className="count">{counts[t.count]}</span>
  return (
    <nav className="tabs" aria-label="Sections">
      <div className="sections" role="tablist" aria-label="Section">
        {GROUPS.map(([g, name]) => (
          <button key={g} role="tab" aria-selected={cur === g} onClick={() => dispatch({ type: 'tab', tab: last[g] || TABS.find((t) => t.group === g).id })}>
            {name}
          </button>
        ))}
      </div>
      <div className="subtabs" role="tablist" aria-label={GROUPS.find((x) => x[0] === cur)[1]}>
        {TABS.filter((t) => t.group === cur).map((t) => (
          <button key={t.id} role="tab" aria-selected={st.tab === t.id} onClick={() => dispatch({ type: 'tab', tab: t.id })}>
            {t.label}{badge(t)}
          </button>
        ))}
      </div>
    </nav>
  )
}
