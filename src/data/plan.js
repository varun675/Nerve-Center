export const ZST = {
  done: { t: 'Completed', c: '#2FB36B' },
  prog: { t: 'In progress', c: '#F2B233' },
  next: { t: 'Planned next', c: '#4C8DF6' },
  later: { t: 'Not started', c: '#9AA5A8' },
}
export const ZORDER = ['later', 'next', 'prog', 'done']
export const BAYS3 = ['West bay', 'Centre bay', 'East bay']
export const REAL_FLOORS = ['Roof', 'Level 2', 'Level 1', 'Ground']

// Zones placed by hand on the real photo (640 × 640 image space).
export const REAL_ZONES = [
  { fl: 'Roof', bay: 0, st: 'later', pct: 0, wk: 'Weeks 9–10', what: 'Roof slab formwork' },
  { fl: 'Roof', bay: 1, st: 'later', pct: 0, wk: 'Weeks 9–10', what: 'Roof slab formwork' },
  { fl: 'Roof', bay: 2, st: 'later', pct: 0, wk: 'Weeks 10–11', what: 'Roof slab formwork' },
  { fl: 'Level 2', bay: 0, st: 'prog', pct: 60, wk: 'Weeks 6–7', what: 'Brick walls', r: [18, 4, 150, 85] },
  { fl: 'Level 2', bay: 1, st: 'prog', pct: 40, wk: 'Weeks 6–8', what: 'Brick walls', r: [150, 4, 400, 85] },
  { fl: 'Level 2', bay: 2, st: 'next', pct: 0, wk: 'Weeks 7–8', what: 'Brick walls', r: [400, 4, 580, 85] },
  { fl: 'Level 1', bay: 0, st: 'done', pct: 100, wk: 'Weeks 3–4', what: 'Frame and brick walls', r: [18, 85, 150, 175] },
  { fl: 'Level 1', bay: 1, st: 'done', pct: 100, wk: 'Weeks 3–5', what: 'Frame and brick walls', r: [150, 85, 400, 175] },
  { fl: 'Level 1', bay: 2, st: 'prog', pct: 70, wk: 'Weeks 4–6', what: 'Brick walls and openings', r: [400, 85, 580, 175] },
  { fl: 'Ground', bay: 0, st: 'done', pct: 100, wk: 'Weeks 1–2', what: 'Frame and brick walls', r: [18, 175, 150, 300] },
  { fl: 'Ground', bay: 1, st: 'done', pct: 100, wk: 'Weeks 1–3', what: 'Frame and brick walls', r: [150, 175, 400, 300] },
  { fl: 'Ground', bay: 2, st: 'done', pct: 100, wk: 'Weeks 2–3', what: 'Frame and brick walls', r: [400, 175, 580, 300] },
]
