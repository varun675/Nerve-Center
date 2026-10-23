// Site media manifest. Put files in public/media/<folder>/ and list them here.
// Paths are relative to public/media/. Dates are ISO (YYYY-MM-DD).
//
// Photos taken from the same spot should share the same `view` name: that is
// what lets the timeline and before/after compare line them up.

import { BASE } from './model'

export const MEDIA_ROOT = import.meta.env.BASE_URL + 'media/'

/** { file, date, view, floor?, zone?, note?, pano? } — pano: a 360° equirectangular photo */
export const PHOTOS = [
  { file: 'photos/p01.jpg', date: '2025-11-04', view: 'Drainage and plumbing', note: 'Underground drainage line in trench' },
  { file: 'photos/p02.jpg', date: '2026-09-17', view: 'Masonry', note: 'Brick partitions, room with ladder' },
  { file: 'photos/p03.jpg', date: '2026-09-17', view: 'Masonry', note: 'Partition walls, room layout' },
  { file: 'photos/p04.jpg', date: '2026-09-17', view: 'Masonry', note: 'Sunken toilet, brick edge and service pipes' },
  { file: 'photos/p05.jpg', date: '2026-09-17', view: 'Masonry', note: 'Partition wall in progress, bricks stacked' },
  { file: 'photos/p06.jpg', date: '2026-09-17', view: 'Masonry', note: 'Full-height brick wall under beam' },
  { file: 'photos/p07.jpg', date: '2026-09-17', view: 'Masonry', note: 'Sunken toilet, brick edge and service pipes' },
  { file: 'photos/p08.jpg', date: '2026-09-17', view: 'Masonry', note: 'Brick wall at window opening' },
  { file: 'photos/p09.jpg', date: '2026-09-17', view: 'Masonry', note: 'Brickwork from ladder, upper course' },
  { file: 'photos/p10.jpg', date: '2026-09-17', view: 'Masonry', note: 'Wall end with conduits waiting' },
  { file: 'photos/p11.jpg', date: '2026-09-17', view: 'Masonry', note: 'Brick wall next to window' },
  { file: 'photos/p12.jpg', date: '2026-09-17', view: 'Masonry', note: 'Narrow passage between walls' },
  { file: 'photos/p13.jpg', date: '2026-09-17', view: 'Masonry', note: 'Doorway opening' },
  { file: 'photos/p14.jpg', date: '2026-09-17', view: 'Masonry', note: 'Corridor with brick infill' },
  { file: 'photos/p15.jpg', date: '2026-09-17', view: 'Masonry', note: 'Room with loose bricks (blurred)' },
  { file: 'photos/p16.jpg', date: '2026-09-17', view: 'Doors and frames', note: 'Timber door frame fixed in plastered wall' },
  { file: 'photos/p17.jpg', date: '2026-09-17', view: 'Electrical', note: 'Conduit run on brick wall' },
  { file: 'photos/p18.jpg', date: '2026-09-17', view: 'Electrical', note: 'Wall chased for switch boxes and conduits' },
  { file: 'photos/p19.jpg', date: '2026-09-17', view: 'Electrical', note: 'Vertical conduit and switch box' },
  { file: 'photos/p20.jpg', date: '2026-09-17', view: 'HVAC', note: 'Duct fabrication in the hall' },
  { file: 'photos/p21.jpg', date: '2026-09-17', view: 'HVAC', note: 'Duct fabrication, hall looking out' },
  { file: 'photos/p22.jpg', date: '2026-09-17', view: 'Drainage and plumbing', note: 'Water lines chased into wall' },
  { file: 'photos/p23.jpg', date: '2026-09-17', view: 'HVAC', note: 'Cutting sheet metal for ducts' },
  { file: 'photos/p24.jpg', date: '2026-09-17', view: 'HVAC', note: 'Finished duct sections stacked in corridor' },
  { file: 'photos/p26.jpg', date: '2026-09-17', view: 'Exterior', note: 'Outer brick wall, window openings, rainwater pipe' },
]

/**
 * { file, date, title, kind: 'walkthrough' | 'drone' | 'timelapse' | '360' | 'clip', poster?, chapters? }
 * chapters: [{ t: seconds, label, floor? }] — lets viewers jump to a floor or zone.
 */
export const VIDEOS = [
  { file: 'videos/2026-02-04_walkthrough.mp4', date: '2026-02-04', title: 'Interior walkthrough', kind: 'walkthrough',
    chapters: [
      { t: 0, label: 'False ceiling grid, first room' },
      { t: 18, label: 'False ceiling grid, main hall' },
      { t: 41, label: 'Double-height space and corridor' },
      { t: 52, label: 'Brick partitions' },
      { t: 58, label: 'View to staircase' },
      { t: 64, label: 'Brick shaft and ladder' },
    ] },
  { file: 'videos/2026-02-04_wall-closeups.mp4', date: '2026-02-04', title: 'Wall and plaster close-ups', kind: 'clip' },
  { file: 'videos/2026-01-31_ceiling-scaffold.mp4', date: '2026-01-31', title: 'Ceiling work from scaffold', kind: 'clip' },
  { file: 'videos/2026-01-22_ceiling-grid.mp4', date: '2026-01-22', title: 'False ceiling grid installed', kind: 'clip' },
  { file: 'videos/2026-01-15_staircase.mp4', date: '2026-01-15', title: 'Curved staircase and ground floor brickwork', kind: 'clip' },
  // iPhone clips have no date in the file name, so these dates are placeholders. Replace them with the real recording dates.
  { file: 'videos/exterior-walk.mp4', date: '2026-09-17', title: 'Exterior walk along the side passage', kind: 'walkthrough' },
  { file: 'videos/roof-terrace.mp4', date: '2026-09-17', title: 'Roof terrace and plot view', kind: 'clip' },
]

/**
 * { file, title, rev?, date?, view?, image? }
 * `view` links a drawing to photos with the same view name.
 * `image` is an optional PNG/JPG export of the drawing, used for the overlay.
 */
export const ELEVATIONS = [
  { file: 'elevations/front.pdf', image: 'elevations/front.png', title: 'Front elevation', date: '2026-09-14', view: 'Exterior' },
  { file: 'elevations/rear.pdf', image: 'elevations/rear.png', title: 'Rear elevation', date: '2026-09-14', view: 'Exterior' },
  { file: 'elevations/right.pdf', image: 'elevations/right.png', title: 'Right side elevation', date: '2026-09-15', view: 'Exterior' },
]

export const KINDS = { walkthrough: 'Walkthrough', drone: 'Drone', timelapse: 'Time-lapse', 360: '360° walk', clip: 'Site clip' }

export const mediaUrl = (f) => (/^(blob:|data:|https?:|\/|\.\/)/.test(f) ? f : MEDIA_ROOT + f)
export const weekOf = (date) => Math.floor((new Date(date) - BASE) / (7 * 864e5)) + 1
export const fmtDate = (date) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const byDate = (a, b) => a.date.localeCompare(b.date)
export const views = (photos) => [...new Set(photos.map((p) => p.view))]

// Files brought in by `npm run ingest` from a WhatsApp chat export. The
// caption on each message becomes the note, and tags it (see data/aars.js).
import INGESTED from './ingested.json'
for (const m of INGESTED) {
  if (m.type === 'video') VIDEOS.push({ id: m.id, file: m.file, date: m.date, title: m.caption || 'WhatsApp clip', kind: m.kind || 'clip' })
  else PHOTOS.push({ id: m.id, file: m.file, date: m.date, view: m.view || 'From WhatsApp', note: m.caption || '', pano: m.pano })
}
