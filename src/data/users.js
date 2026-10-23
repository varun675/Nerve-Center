export const ROLES = ['Viewer', 'Site engineer', 'Project manager', 'Admin']

export const USERS = [
  { id: 'anita', name: 'Anita Rao', role: 'Viewer', email: 'anita.rao@example.com', scope: null, scopeText: 'All floors, read only' },
  { id: 'sk', name: 'S. Kulkarni', role: 'Site engineer', email: 's.kulkarni@example.com', scope: [7, 8], scopeText: 'Floors 7 and 8' },
  { id: 'rahul', name: 'Rahul Verma', role: 'Project manager', email: 'rahul.verma@example.com', scope: null, scopeText: 'All floors' },
  { id: 'priya', name: 'Priya Menon', role: 'Admin', email: 'priya.menon@example.com', scope: null, scopeText: 'All floors and settings' },
]
export const SYSTEM_USER = { id: 'system', name: 'System', role: 'Automatic' }

export const PERMS = [
  ['view', 'View dashboards and evidence', ROLES],
  ['export', 'Export and share reports', ROLES],
  ['confirm', 'Confirm AI detections', ['Site engineer', 'Project manager', 'Admin']],
  ['submit', 'Submit manual updates', ['Site engineer', 'Project manager', 'Admin']],
  ['approve', 'Approve or reject manual updates', ['Project manager', 'Admin']],
  ['devices', 'Restart and manage site devices', ['Admin']],
  ['users', 'Manage users and roles', ['Admin']],
]

export const U = (id) => (id === 'system' ? SYSTEM_USER : USERS.find((u) => u.id === id))

export function can(user, perm, floor) {
  const row = PERMS.find((x) => x[0] === perm)
  if (!row || !row[2].includes(user.role)) return false
  if (floor != null && user.scope && !user.scope.includes(+floor)) return false
  return true
}

export const approvers = (except) => USERS.filter((u) => (u.role === 'Project manager' || u.role === 'Admin') && u.id !== except)
