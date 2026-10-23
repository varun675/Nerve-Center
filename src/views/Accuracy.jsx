import { REAL } from '../data/realData'
import { ExtLink, Meter } from '../components/ui.jsx'

const NAMES = { Person: 'Workers', helmet: 'Helmets', vest: 'Safety vests' }
const TRAINED = [
  ['Of its detections, correct (precision)', 0.95],
  ['Of the labelled objects, found (recall)', 0.7975],
  ['Overall detection score (mAP at IoU 0.5)', 0.8767],
  ['Strict detection score (mAP at IoU 0.5–0.95)', 0.6152],
]

export default function Accuracy() {
  return (
    <>
      <h2>What the model gets right today, and what training adds</h2>
      <p className="lede">We scored the model against all 82 labelled test images. It was never trained on this dataset, so this is its out-of-the-box performance. For comparison, a published model trained on this same dataset is shown alongside.</p>
      <div className="grid2">
        <div className="panel">
          <h3>Out of the box, on 82 unseen images</h3>
          <div className="tablewrap">
            <table className="acc">
              <thead><tr><th>Object</th><th>Of its detections, correct</th><th>Of the labelled objects, found</th></tr></thead>
              <tbody>
                {Object.keys(NAMES).map((k) => {
                  const s = REAL.stats[k]
                  return (
                    <tr key={k} style={{ cursor: 'default' }}>
                      <td>{NAMES[k]}<br /><small className="muted">{s.tp + s.fn} labelled</small></td>
                      <td><Meter v={s.precision} /></td>
                      <td><Meter v={s.recall} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="src-note">A detection counts as correct when its box overlaps a labelled box by at least 50% (IoU ≥ 0.5).</p>
        </div>
        <div className="panel">
          <h3>After training on this dataset</h3>
          {TRAINED.map(([label, v]) => (
            <div key={label} className="cmp"><div className="l"><span>{label}</span></div><Meter v={v} trained /></div>
          ))}
          <p className="src-note">
            YOLOv8s trained for 200 epochs, validation results averaged across all 10 classes, from the public{' '}
            <ExtLink href="https://github.com/VoxDroid/Construction-Site-Safety-PPE-Detection">Construction-Site-Safety-PPE-Detection</ExtLink> repository.
            Not measured by us, and averaged differently from the left-hand table, so treat the comparison as indicative.
          </p>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 20 }}>
        <h3>How to read this</h3>
        <ul className="caveats">
          <li><b>Workers are the strongest signal already.</b> About three in four detected workers are real, but crowded scenes are undercounted.</li>
          <li><b>Helmets and vests need training.</b> The model learned from a different dataset with different labelling habits, which is why its helmet scores are low here.</li>
          <li><b>Training on matching data closes most of the gap.</b> The model trained on this dataset finds about 8 in 10 labelled objects, and 95% of its detections are correct. We expect training on your own site images to work the same way, and the pilot would measure it.</li>
          <li><b>People stay in the loop.</b> Low-confidence detections go to a reviewer, like the false worker on the substation image, and each correction improves the next model.</li>
          <li><b>These are safety detections, not progress detections.</b> Measuring work progress (blockwork, slabs, MEP) needs its own labelled images. Collecting them is the first task of the pilot.</li>
        </ul>
      </div>
    </>
  )
}
