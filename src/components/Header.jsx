import { MAXW, MINW, weekDates } from '../data/model'
import { USERS } from '../data/users'
import { useStore } from '../state/store.jsx'
import { usePlatform } from '../platform'

export default function Header({ tab }) {
  const { st, dispatch } = useStore()
  const p = usePlatform()
  const badge = tab.id === 'plan'
    ? 'Real site photo, plan data'
    : tab.group === 'real' ? 'Real public images and model output' : 'AARC 1st Phase'
  const real = tab.id === 'plan' || tab.group === 'real'
  return (
    <header className="top">
      <div className="brand">
        <strong>Project AARC NERVE</strong>
        <span>{tab.group === 'aars' ? 'Construction progress intelligence, AARS 057 villa' : 'Construction progress intelligence, Tower B AARC project'}</span>
      </div>
      {tab.week && (
        <div className="week" aria-label="Reporting week">
          <button aria-label="Previous week" disabled={st.W <= MINW} onClick={() => dispatch({ type: 'week', W: st.W - 1 })}>‹</button>
          <div className="lbl"><b>Week {st.W}</b><small>{weekDates(st.W)}</small></div>
          <button aria-label="Next week" disabled={st.W >= MAXW} onClick={() => dispatch({ type: 'week', W: st.W + 1 })}>›</button>
        </div>
      )}
      <span className={(real ? ' real' : '')}>{badge}</span>
      {p.me?.id ? (
        <span className="who">Signed in as <b>{p.me.name || 'you'}</b>{p.me.canEdit ? ', can approve' : ''}</span>
      ) : (
      <label className="who">
        Signed in as
        <select aria-label="Signed-in user" value={st.meId} onChange={(e) => dispatch({ type: 'user', id: e.target.value })}>
          {USERS.map((u) => <option key={u.id} value={u.id}>{u.name}, {u.role}</option>)}
        </select>
      </label>
      )}
    </header>
  )
}
