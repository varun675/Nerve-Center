import Header from './components/Header.jsx'
import Tabs, { TABS } from './components/Tabs.jsx'
import Toast from './components/Toast.jsx'
import Dialog from './components/Dialog.jsx'
import { useStore } from './state/store.jsx'
import Devices from './views/Devices.jsx'
import Sprint from './views/Sprint.jsx'
import PlanCapture from './views/PlanCapture.jsx'
import Overview from './views/Overview.jsx'
import Reconciliation from './views/Reconciliation.jsx'
import ReviewQueue from './views/ReviewQueue.jsx'
import Warnings from './views/Warnings.jsx'
import FieldLoop from './views/FieldLoop.jsx'
import WeeklyReport from './views/WeeklyReport.jsx'
import Changes from './views/Changes.jsx'
import Access from './views/Access.jsx'
import Vision from './views/Vision.jsx'
import Accuracy from './views/Accuracy.jsx'
import Photos from './views/Photos.jsx'
import Videos from './views/Videos.jsx'
import ElevationProgress from './views/ElevationProgress.jsx'
import Home from './views/Home.jsx'
import Schedule from './views/Schedule.jsx'
import Capture from './views/Capture.jsx'
import AiReview from './views/AiReview.jsx'
import Snags from './views/Snags.jsx'
import Payments from './views/Payments.jsx'
import ClientReport from './views/ClientReport.jsx'
import FloorPlans from './views/FloorPlans.jsx'

const VIEWS = {
  home: Home, elev: ElevationProgress, schedule: Schedule, capture: Capture, ai: AiReview, snags: Snags,
  payments: Payments, client: ClientReport, plans: FloorPlans, photos: Photos, videos: Videos,
  devices: Devices, sprint: Sprint, plan: PlanCapture, overview: Overview, recon: Reconciliation,
  review: ReviewQueue, warn: Warnings, field: FieldLoop, report: WeeklyReport, changes: Changes,
  access: Access, vision: Vision, accuracy: Accuracy,
}

export default function App() {
  const { st } = useStore()
  const tab = TABS.find((t) => t.id === st.tab) || TABS[0]
  return (
    <>
      <Header tab={tab} />
      <Tabs />
      <main>
        {/* Views stay mounted so their local state survives tab switches */}
        {Object.entries(VIEWS).map(([id, View]) => (
          <section key={id} id={'v-' + id} className={'view' + (tab.id === id ? ' on' : '')}>
            <View />
          </section>
        ))}
      </main>
      <Toast />
      <Dialog />
    </>
  )
}
