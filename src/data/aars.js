// AARS 057, residential villa. Everything the progress views compute comes
// from this file plus the shared data people add in the app.
//
// Evidence refs: 'p26' → media/photos/p26.jpg; 'v:<file stem>@<seconds>' → a
// moment in a video; 'cap:<id>' → a photo taken with the Capture tab.
// The date of an observation is the date of its evidence.

export const PROJECT = {
  name: 'AARS 057',
  kind: 'Residential villa, G+1 with terrace, stair tower and dome',
  architect: 'Imagination Unlimited (Ar. Chandan Potdar)',
  today: '2026-09-24',
}

export const FACADE_STAGES = ['Structure', 'Brickwork', 'Plaster', 'Facade details', 'Paint and finish']
export const SIDES = [['front', 'Front', 'F'], ['rear', 'Rear', 'B'], ['right', 'Right side', 'R']]

// Zones on each elevation drawing, in a 1000 × 707 page space (A3 landscape).
export const ELEVATIONS = {
  front: {
    crop: [54, 150, 910, 390],
    zones: [
      { id: 'f-dome', name: 'Dome', r: [478, 177, 569, 290] },
      { id: 'f-par', name: 'Terrace parapet and railing', r: [114, 288, 940, 311] },
      { id: 'f-ff-l', name: 'First floor, left wing', r: [114, 311, 431, 392] },
      { id: 'f-ff-c', name: 'First floor, centre', r: [431, 311, 615, 392] },
      { id: 'f-ff-r', name: 'First floor, right wing', r: [615, 311, 940, 392] },
      { id: 'f-gf-l', name: 'Ground floor, left wing', r: [114, 392, 431, 468] },
      { id: 'f-gf-c', name: 'Main entrance', r: [431, 392, 615, 468] },
      { id: 'f-gf-r', name: 'Ground floor, right wing', r: [615, 392, 940, 468] },
    ],
  },
  rear: {
    crop: [46, 110, 916, 340],
    zones: [
      { id: 'b-dome', name: 'Dome', r: [500, 132, 569, 185] },
      { id: 'b-tower', name: 'Stair tower (mumty)', r: [458, 185, 638, 246] },
      { id: 'b-par', name: 'Terrace parapet and railing', r: [106, 246, 932, 269] },
      { id: 'b-ff', name: 'First floor', r: [106, 269, 932, 338] },
      { id: 'b-gf', name: 'Ground floor', r: [106, 338, 932, 420] },
    ],
  },
  right: {
    crop: [69, 105, 893, 435],
    zones: [
      { id: 'r-dome', name: 'Dome', r: [427, 128, 538, 277] },
      { id: 'r-mumty', name: 'Stair tower (mumty)', r: [573, 196, 800, 277] },
      { id: 'r-par', name: 'Terrace parapet and railing', r: [215, 277, 908, 304] },
      { id: 'r-ff', name: 'First floor and side terrace', r: [127, 304, 877, 400] },
      { id: 'r-gf', name: 'Ground floor, side passage', r: [127, 400, 877, 485] },
    ],
  },
}
export const ZONES = Object.entries(ELEVATIONS).flatMap(([side, e]) => e.zones.map((z) => ({ ...z, side })))
export const zoneById = (id) => ZONES.find((z) => z.id === id)

// Inside the building, in the order the trades normally follow.
export const TRADES = [
  { id: 'struct', name: 'RCC frame and staircase' },
  { id: 'brick', name: 'Brick partitions' },
  { id: 'drain', name: 'Drainage and water lines' },
  { id: 'elec', name: 'Electrical conduits and chasing' },
  { id: 'plaster', name: 'Internal plaster' },
  { id: 'hvac', name: 'HVAC ducting' },
  { id: 'doors', name: 'Door frames' },
  { id: 'ceiling', name: 'False ceiling grid' },
  { id: 'floor', name: 'Flooring' },
  { id: 'paint', name: 'Painting and finishes' },
]
export const tradeById = (id) => TRADES.find((t) => t.id === id)

// ---- Observations from the photo and video review (24 Sep 2026) ----------
// Facade: { ref, zone, stage (index into FACADE_STAGES), status, assumed? }
const FRAME = ['v:2026-01-15_staircase@1', 'v:2026-02-04_walkthrough@41', 'v:roof-terrace@2']
const frame = (zone) => FRAME.map((ref) => ({ ref, zone, stage: 0, status: 'done' }))
export const FACADE_OBS = [
  ...['f-ff-l', 'f-ff-c', 'f-ff-r', 'f-gf-l', 'f-gf-c', 'f-gf-r', 'b-ff', 'b-gf', 'r-ff', 'r-gf', 'f-par', 'b-par', 'r-par'].flatMap(frame),
  ...['f-par', 'b-par', 'r-par'].map((zone) => ({ ref: 'v:roof-terrace@4', zone, stage: 1, status: 'prog' })),
  { ref: 'v:roof-terrace@6', zone: 'b-tower', stage: 0, status: 'done' },
  { ref: 'v:roof-terrace@6', zone: 'r-mumty', stage: 0, status: 'done' },
  { ref: 'p26', zone: 'b-gf', stage: 1, status: 'done', assumed: true },
  { ref: 'v:exterior-walk@2', zone: 'r-gf', stage: 1, status: 'done', assumed: true },
  { ref: 'v:exterior-walk@2', zone: 'r-gf', stage: 2, status: 'prog', assumed: true },
]
// Interior: { ref, trade, status }
const t = (trade, status, refs) => refs.map((ref) => ({ ref, trade, status }))
export const TRADE_OBS = [
  ...t('struct', 'done', ['v:2026-01-15_staircase@1', 'v:roof-terrace@2']),
  ...t('brick', 'done', ['v:2026-02-04_walkthrough@52', 'p02', 'p03', 'p05', 'p06', 'p09', 'p14']),
  ...t('drain', 'prog', ['p01', 'p22', 'p04', 'p07']),
  ...t('elec', 'prog', ['p10', 'p17', 'p18', 'p19']),
  ...t('plaster', 'prog', ['v:2026-02-04_walkthrough@41', 'p16', 'p18', 'p19']),
  ...t('hvac', 'prog', ['p20', 'p21', 'p23', 'p24']),
  ...t('doors', 'prog', ['p16']),
  ...t('ceiling', 'prog', ['v:2026-01-22_ceiling-grid@2', 'v:2026-01-31_ceiling-scaffold@3', 'v:2026-02-04_walkthrough@0', 'v:2026-02-04_walkthrough@18']),
]

// ---- Plan -----------------------------------------------------------------
// ESTIMATED dates, set from the evidence and a typical villa sequence. Replace
// with the contractor's programme; the Schedule tab can also edit them.
export const PLAN = {
  'facade:0': ['2025-08-01', '2025-12-31'],
  'facade:1': ['2025-11-01', '2026-04-30'],
  'facade:2': ['2026-05-01', '2026-08-31'],
  'facade:3': ['2026-07-01', '2026-12-15'],
  'facade:4': ['2026-11-15', '2027-02-28'],
  'trade:struct': ['2025-08-01', '2025-12-31'],
  'trade:brick': ['2025-11-01', '2026-03-15'],
  'trade:drain': ['2025-11-01', '2026-05-31'],
  'trade:elec': ['2026-01-01', '2026-06-30'],
  'trade:plaster': ['2026-03-01', '2026-08-31'],
  'trade:hvac': ['2026-04-01', '2026-09-30'],
  'trade:doors': ['2026-03-01', '2026-06-30'],
  'trade:ceiling': ['2026-01-15', '2026-07-31'],
  'trade:floor': ['2026-09-01', '2026-11-30'],
  'trade:paint': ['2026-11-01', '2027-01-31'],
}

// ---- Payment milestones (share of contract value) ---------------------------
// `needs` lists what must be complete, checked against the evidence.
export const MILESTONES = [
  { id: 'm1', name: 'RCC frame and staircase', pct: 20, needs: ['trade:struct', 'facade:0'] },
  { id: 'm2', name: 'Brickwork, inside and facade', pct: 15, needs: ['trade:brick', 'facade:1'] },
  { id: 'm3', name: 'Services rough-in (drainage, electrical, HVAC)', pct: 15, needs: ['trade:drain', 'trade:elec', 'trade:hvac'] },
  { id: 'm4', name: 'Plaster, inside and facade', pct: 10, needs: ['trade:plaster', 'facade:2'] },
  { id: 'm5', name: 'Doors, false ceiling and flooring', pct: 15, needs: ['trade:doors', 'trade:ceiling', 'trade:floor'] },
  { id: 'm6', name: 'Facade details and dome', pct: 10, needs: ['facade:3'] },
  { id: 'm7', name: 'Painting and handover', pct: 15, needs: ['trade:paint', 'facade:4'] },
]

// ---- Fixed capture spots ------------------------------------------------------
// Stand in the same place every week so photos line up.
export const SPOTS = [
  { id: 's-front', name: 'Front elevation, from the gate', where: 'Stand at the main gate, centred on the entrance. Get the whole front and the dome in frame.', zone: 'f-gf-c', ref: null },
  { id: 's-rear', name: 'Rear elevation', where: 'Stand at the back boundary wall, centred. Whole rear face in frame.', zone: 'b-gf', ref: 'p26' },
  { id: 's-right', name: 'Right side, from the side passage', where: 'Stand at the front end of the side passage, looking along the wall.', zone: 'r-gf', ref: 'v:exterior-walk@2' },
  { id: 's-roof', name: 'Terrace, from the stair tower door', where: 'Stand in the stair tower doorway, looking across the terrace to the dome.', zone: 'f-par', ref: 'v:roof-terrace@2' },
  { id: 's-hall', name: 'Main hall, ground floor', where: 'Stand in the doorway from the entrance lobby, looking at the ceiling grid and the far windows.', trade: 'ceiling', ref: 'v:2026-02-04_walkthrough@18' },
  { id: 's-stair', name: 'Curved staircase', where: 'Stand at the foot of the stair, looking up the curve.', trade: 'struct', ref: 'v:2026-01-15_staircase@1' },
  { id: 's-toilet', name: 'Ground floor toilet (sunken)', where: 'Stand in the doorway, looking at the sunken floor and the service pipes.', trade: 'drain', ref: 'p04' },
  { id: 's-duct', name: 'HVAC corridor', where: 'Stand at the corridor end, looking along the duct run.', trade: 'hvac', ref: 'p24' },
]

// ---- Caption codes for WhatsApp ingest ---------------------------------------
// A caption like "F-GF-L plaster wip" or "ELEC done" tags a photo on arrival.
export const CAPTION_HELP = [
  ['Facade zone', 'F-GF-L, F-FF-C, B-GF, R-PAR, F-DOME … (F front, B back, R right side)'],
  ['Stage', 'structure, brick, plaster, details, paint'],
  ['Interior trade', 'STRUCT, BRICK, DRAIN, ELEC, PLASTER, HVAC, DOORS, CEILING, FLOOR, PAINT'],
  ['Status', 'done or wip (default wip)'],
]

// First snags, from the photo review. Used to fill an empty local store; the
// hosted database gets the same rows once, from Claude.
export const SEED_SNAGS = [
  { id: 'sn1', title: 'Ladder used as a work platform, no footing or tie-off', sev: 'high', trade: 'Safety', status: 'open', photo: 'p09', where: 'Interior, first floor room', createdAt: '2026-09-24' },
  { id: 'sn2', title: 'Drainage trench left open next to the wall', sev: 'high', trade: 'Safety', status: 'open', photo: 'p01', where: 'Ground floor, service trench', createdAt: '2026-09-24' },
  { id: 'sn3', title: 'Conduit ends left loose at partition wall end', sev: 'medium', trade: 'Electrical', status: 'open', photo: 'p10', where: 'Interior partition', createdAt: '2026-09-24' },
  { id: 'sn4', title: 'Vegetation and debris against the outer wall; clear before plaster', sev: 'medium', trade: 'Housekeeping', status: 'open', photo: 'p26', pin: { side: 'rear', x: 300, y: 395 }, where: 'Rear ground floor (location to confirm)', createdAt: '2026-09-24' },
  { id: 'sn5', title: 'Loose bricks and rubble across rooms', sev: 'low', trade: 'Housekeeping', status: 'open', photo: 'p05', where: 'Interior rooms', createdAt: '2026-09-24' },
  { id: 'sn6', title: 'Dark staining on slab soffit; check and clean before ceiling and paint', sev: 'low', trade: 'Finishes', status: 'open', photo: 'p06', where: 'Interior ceilings', createdAt: '2026-09-24' },
]

// ---- Floor plans ---------------------------------------------------------------
// Add one entry per floor once the plan PDFs arrive: export each page as PNG into
// public/media/plans/, then mark rooms as rectangles in percent of the image.
// Observations and captures with a matching `room` show up on the plan.
//   { id: 'gf', title: 'Ground floor plan', image: 'plans/gf.png',
//     rooms: [{ id: 'gf-hall', name: 'Main hall', r: [10, 20, 45, 60] }] }
export const FLOOR_PLANS = []
