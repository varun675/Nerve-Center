export const DEVICES = [
  { id: 'CAM-360-01', name: '360° helmet camera', loc: 'Floors 6 to 8', feeds: 'Progress photos', st: 'on', n: 1240 },
  { id: 'CAM-360-02', name: '360° helmet camera', loc: 'Floors 3 to 5', feeds: 'Progress photos', st: 'on', n: 1105 },
  { id: 'DRN-01', name: 'Survey drone', loc: 'Roof and facade', feeds: 'Aerial photos, volumes', st: 'off', n: 0, why: 'Grounded, wind above limit' },
  { id: 'CCTV-G1', name: 'Gate camera', loc: 'Main gate', feeds: 'Worker count, safety gear', st: 'on', n: 8640 },
  { id: 'CCTV-T1', name: 'Crane camera', loc: 'Tower crane', feeds: 'Top-down progress', st: 'on', n: 4320 },
  { id: 'RFID-G1', name: 'Turnstile reader', loc: 'Main gate', feeds: 'Attendance', st: 'on', n: 612 },
  { id: 'SNS-C8', name: 'Concrete sensor', loc: 'Floor 8 slab', feeds: 'Curing strength', st: 'on', n: 288 },
  { id: 'SNS-WX', name: 'Weather station', loc: 'Site office roof', feeds: 'Rain, wind, heat', st: 'on', n: 288 },
  { id: 'APP-SITE', name: 'Site engineer app', loc: 'Mobile', feeds: 'Manual updates, photos', st: 'on', n: 57 },
  { id: 'ERP-GRN', name: 'Material receipts', loc: 'ERP connection', feeds: 'Deliveries', st: 'on', n: 14 },
  { id: 'SCH-P6', name: 'Schedule import', loc: 'Planning system', feeds: 'Planned dates', st: 'on', n: 1 },
]

const rnd = (a) => a[Math.floor(Math.random() * a.length)]
const int = (a, b) => a + Math.floor(Math.random() * (b - a))

// Each generator returns [deviceId, message, isPhotoForAI]
const GENERATORS = [
  () => ['CAM-360-01', `uploaded ${int(30, 60)} frames from floor ${rnd([6, 7, 8])}`, true],
  () => ['CAM-360-02', `uploaded ${int(25, 55)} frames from floor ${rnd([3, 4, 5])}`, true],
  () => ['CCTV-G1', `counted ${int(2, 11)} workers entering, ${Math.random() < 0.2 ? '1 without a helmet' : 'all with helmets'}`, false],
  () => ['CCTV-T1', 'top-down frame analysed, slab formwork 72% placed on floor 8', true],
  () => ['RFID-G1', `${int(1, 7)} badge swipes at main gate`, false],
  () => ['SNS-C8', `floor 8 slab strength ${(17 + Math.random() * 3).toFixed(1)} MPa, curing on track`, false],
  () => ['SNS-WX', `wind ${int(34, 44)} km/h, rain 0 mm`, false],
  () => ['ERP-GRN', `delivery received: ${rnd(['500 m conduit', '1,200 blocks', '40 bags plaster', '60 junction boxes'])}`, false],
]

export function randomFeedEvent() {
  const [dev, txt, ai] = rnd(GENERATORS)()
  return {
    dev, txt, ai,
    reconciled: Math.random() < 0.1,
    t: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
}
