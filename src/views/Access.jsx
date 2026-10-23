import { PERMS, ROLES, USERS } from '../data/users'
import { useStore } from '../state/store.jsx'

export default function Access() {
  const { me } = useStore()
  return (
    <>
      <h2>Access control</h2>
      <p className="lede">What each person can do depends on their role, and site engineers are limited to the floors they're responsible for. Use "Signed in as" at the top to see the app through each role.</p>
      <div className="panel">
        <h3>Users</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Data scope</th><th>Email</th></tr></thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.id} style={{ cursor: 'default', background: u.id === me.id ? 'var(--blue-soft)' : undefined }}>
                  <td>{u.name}{u.id === me.id && ' (you)'}</td><td>{u.role}</td><td>{u.scopeText}</td><td>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 20 }}>
        <h3>What each role can do</h3>
        <div className="tablewrap">
          <table className="matrix">
            <thead><tr><th>Permission</th>{ROLES.map((r) => <th key={r} className={r === me.role ? 'me' : ''}>{r}</th>)}</tr></thead>
            <tbody>
              {PERMS.map(([id, text, roles]) => (
                <tr key={id} style={{ cursor: 'default' }}>
                  <td>{text}</td>
                  {ROLES.map((r) => (
                    <td key={r} className={r === me.role ? 'me' : ''}>
                      {roles.includes(r) ? <span className="yes" aria-label="Allowed">✓</span> : <span className="no" aria-label="Not allowed">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
