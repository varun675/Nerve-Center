import { useEffect } from 'react'
import { randomFeedEvent } from '../data/devices'
import { useStore } from '../state/store.jsx'
import { Kpi, Pipeline } from '../components/ui.jsx'

const fmt = (n) => n.toLocaleString('en-IN')

export default function Devices() {
  const { st, dispatch, can } = useStore()

  // Simulated live data from site devices
  useEffect(() => {
    for (let i = 0; i < 8; i++) dispatch({ type: 'feed', event: randomFeedEvent() })
    const t = setInterval(() => dispatch({ type: 'feed', event: randomFeedEvent() }), 2600)
    return () => clearInterval(t)
  }, [dispatch])

  const restart = (id) => {
    dispatch({ type: 'restart', id })
    if (can('devices')) setTimeout(() => dispatch({ type: 'online', id }), 2500)
  }

  const on = st.devices.filter((d) => d.st === 'on').length
  return (
    <>
      <h2>Site devices and data feeds</h2>
      <p className="lede">Every figure in this app starts here. Cameras, drones, gate counters, sensors and connected systems send data continuously. Each record is checked, analysed and stored with its source, so any number can be traced back to the device that produced it.</p>
      <div className="kpis">
        <Kpi v={on} small={`of ${st.devices.length}`} k="Devices online" />
        <Kpi v={fmt(st.pipe.in)} k="Records received today" />
        <Kpi v={fmt(st.pipe.ai)} k="Photos analysed by AI today" />
        <Kpi v={st.changes.filter((c) => c.status === 'Pending').length} k="Manual updates waiting for approval" />
      </div>
      <Pipeline style={{ margin: '0 0 20px' }} steps={[
        ['Received', `${fmt(st.pipe.in)} records from ${on} devices`],
        ['Checked', `${fmt(st.pipe.ok)} passed time, location and format checks`],
        ['Analysed', `${fmt(st.pipe.ai)} photos run through detection models`],
        ['Reconciled', `${st.pipe.rec} work packages updated against plan and reports`],
      ]} />
      <div className="split">
        <div className="panel">
          <h3>Connected devices</h3>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Device</th><th>Location and feeds</th><th>Status</th><th className="num">Records today</th><th></th></tr></thead>
              <tbody>
                {st.devices.map((d) => (
                  <tr key={d.id} style={{ cursor: 'default' }}>
                    <td><b>{d.id}</b><br /><small className="muted">{d.name}</small></td>
                    <td>{d.loc}<br /><small className="muted">{d.feeds}</small></td>
                    <td>
                      <span className={'dot ' + d.st} />
                      {d.st === 'on' ? 'Online' : d.st === 'sync' ? 'Reconnecting' : 'Offline'}
                      {d.why && d.st === 'off' && <><br /><small className="muted">{d.why}</small></>}
                    </td>
                    <td className="num">{fmt(d.n)}</td>
                    <td>
                      {d.st === 'off' && (
                        <button className="btn" disabled={!can('devices')} title={can('devices') ? undefined : 'Only admins can manage devices'} onClick={() => restart(d.id)}>Reconnect</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <h3>Live feed</h3>
          <ul className="feed">
            {st.feed.length === 0 && <li className="empty">Waiting for data…</li>}
            {st.feed.map((f, i) => (
              <li key={f.t + f.dev + i} className={i === 0 ? 'new' : ''}><time>{f.t}</time><span><b>{f.dev}</b> {f.txt}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
