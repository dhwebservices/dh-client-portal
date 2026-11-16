import { useEffect, useState } from 'react'
import { api, ago, date } from '../api'

export default function Activity({ open }) {
  const [list, setList] = useState(null)
  useEffect(() => { api('admin/activity').then((r) => setList(r.activity)).catch(() => setList([])) }, [])
  // Group by day so a long log stays readable.
  const days = []
  for (const a of list || []) {
    const d = date(a.created_at)
    if (!days.length || days[days.length - 1].d !== d) days.push({ d, items: [] })
    days[days.length - 1].items.push(a)
  }
  return (
    <>
      <div className="page__head"><h1>Activity</h1><p>Who did what, across every client. Latest 200.</p></div>
      {list === null ? <p className="hint">Loading…</p> : list.length === 0 ? <p className="empty">Nothing yet.</p> : days.map((g) => (
        <section key={g.d} className="section">
          <h2 className="h3">{g.d}</h2>
          <ul className="log">
            {g.items.map((a) => (
              <li key={a.id}>
                <span>
                  <b>{a.actor}</b>{!a.staff && <span className="pill" style={{ margin: '0 6px' }}>client</span>} {a.action.charAt(0).toLowerCase() + a.action.slice(1)}
                  {a.business && <> · <button className="link" onClick={() => open(a.client_id)}>{a.business}</button></>}
                </span>
                <span className="meta nowrap">{ago(a.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
