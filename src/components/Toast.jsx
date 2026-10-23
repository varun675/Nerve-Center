import { useEffect } from 'react'
import { useStore } from '../state/store.jsx'

export default function Toast() {
  const { st, dispatch } = useStore()
  const t = st.toast
  useEffect(() => {
    if (!t) return
    const h = setTimeout(() => dispatch({ type: 'clearToast', id: t.id }), 4200)
    return () => clearTimeout(h)
  }, [t, dispatch])
  return (
    <div className={'toast' + (t ? ' show' : '') + (t && t.bad ? ' bad' : '')} role="status">
      {t && t.msg}
    </div>
  )
}
