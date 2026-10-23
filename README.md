# Project AARC NERVE, React POC

Construction progress intelligence: site device feeds, sprint review, plan vs capture,
evidence-backed progress, rights-based manual changes with approvals, audit trail and email
notifications, plus real AI detection results on public construction photos.

## Run it

Requires Node.js 18 or later.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the production build
```

## Project structure

```
src/
  main.jsx               App entry, wraps everything in the store provider
  App.jsx                Header, tabs, views, toast and dialog
  styles.css             All styling (theme tokens, light and dark mode)
  state/
    store.jsx            Global state (useReducer): users, approvals, audit trail,
                         emails, devices, live feed, overrides
  data/
    model.js             Tower B schedule and progress model
    users.js             Users, roles, permissions and floor scopes
    devices.js           Site devices and the simulated live feed
    sprint.js            Sprint definitions, root causes and fixes
    plan.js              Plan zones mapped onto the real building photo
    realData.js/.json    Real photos and offline model results
  components/
    Header.jsx           Week selector, data badge, signed-in user switch
    Tabs.jsx             Navigation with live counters
    Dialog.jsx           Evidence and sprint task popups
    EvidenceImage.jsx    Illustrated capture with detection box
    Toast.jsx, ui.jsx    Small shared pieces
  views/                 One file per tab
  assets/site/           Real construction photos (CC BY 4.0)
```

## How the main flows work

**Roles.** `data/users.js` defines four roles (Viewer, Site engineer, Project manager,
Admin) and a permission matrix. Site engineers are limited to their floors.
`useStore().can(permission, floor)` is used everywhere a button or form needs a check.

**Manual changes.** A submission (`dispatch({ type: 'submit' })`) creates a pending change
request, writes to the audit trail and emails the approvers. A decision
(`dispatch({ type: 'decide' })`) is blocked for the submitter, requires a comment to reject,
applies the value only when approved, and emails the whole team. Approved values are
marked as manual everywhere they appear, and the original device value stays in the trail.

**Device feed.** `views/Devices.jsx` dispatches a random event every 2.6 seconds.
Offline devices ignore events until an admin reconnects them.

## What is real and what is simulated

| Part | Source |
|---|---|
| Site photos in "AI on real site photos" and "Plan vs capture" | Real, [Construction Site Safety dataset](https://universe.roboflow.com/roboflow-universe-projects/construction-site-safety/dataset/28), Roboflow Universe, CC BY 4.0 |
| Worker, helmet and vest detections and accuracy scores | Real output of the YOLO11n PPE model from [Real-Time-PPE-Detection-System](https://github.com/Minhalali7860/Real-Time-PPE-Detection-System), run offline with ONNX Runtime |
| Trained-model benchmark | Published results from [Construction-Site-Safety-PPE-Detection](https://github.com/VoxDroid/Construction-Site-Safety-PPE-Detection) |
| Plan zones on the building photo | Placed by hand for the |
| Tower B schedule, progress, devices, users, emails |

## Moving towards production

- Replace `data/model.js` with API calls to the progress service (schedule import, detections, contractor reports).
- Replace the reducer's `mail()` with a call to your email service, and keep the in-app log.
- Move `can()` checks to the backend as well; the UI checks are for usability, not security.
- Replace the live-feed simulator with a WebSocket or server-sent events stream from the ingestion pipeline.
- Replace hand-placed plan zones with zones projected from the BIM model using camera pose.
