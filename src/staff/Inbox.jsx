import { useEffect, useState } from 'react'
import { api, money, ymd, ago, bytes } from '../api'
import { STATUS } from '../client/Requests'

/** Everything across all clients that is waiting on us. */
export default function Inbox({ open }) {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([api('admin/inbox'), api('admin/clients')]).then(([i, c]) => setD({ ...i, overdue: c.overdue, renewals: c.renewals })).catch((e) => setError(e.message))
  }, [])
  if (error) return <p className="error">{error}</p>
  if (!d) return <p className="hint">Loading…</p>

  const needsReply = d.requests.filter((r) => !r.last_msg || r.last_staff === 0)
  const waiting = d.requests.filter((r) => r.last_msg && r.last_staff === 1)
  const changes = d.approvals.filter((a) => a.status === 'changes')
  const approved = d.approvals.filter((a) => a.status === 'approved')
  const nothing = !d.requests.length && !changes.length && !d.overdue.length && !d.renewals.length && !d.files.length

  return (
    <div className="stack">
      <div className="page__head"><h1>Inbox</h1><p>Everything waiting on us, across every client, oldest first.</p></div>
      {nothing && <section className="section"><p className="empty">All clear. Nothing waiting on us.</p></section>}

      {needsReply.length > 0 && <ReqList title="Needs a reply" list={needsReply} open={open} />}
      {changes.length > 0 && (
        <section className="section">
          <h2>Design changes asked for</h2>
          <ul className="list">{changes.map((a) => (
            <li key={a.id}><button className="req" onClick={() => open(a.client_id, 'project')}>
              <span className="req__main"><span><b>{a.business}</b>: {a.title}</span><span className="clip2 meta">{a.response}</span></span>
              <span className="meta nowrap">{ago(a.responded_at)}</span>
            </button></li>
          ))}</ul>
        </section>
      )}
      {(d.overdue.length > 0 || d.renewals.length > 0) && (
        <section className="section">
          <h2>Money</h2>
          <ul className="list">
            {d.overdue.map((i) => (
              <li key={i.id}><button className="req" onClick={() => open(i.client_id, 'billing')}>
                <span className="req__main"><span><b>{i.business}</b>: {i.description}</span><span className="meta">Was due {ymd(i.due_date)}</span></span>
                <span className="pill pill--red">{money(i.amount_pence)} overdue</span>
              </button></li>
            ))}
            {d.renewals.map((c) => (
              <li key={c.id}><button className="req" onClick={() => open(c.id, 'billing')}>
                <span className="req__main"><span><b>{c.business}</b>: {c.plan || 'plan'}</span><span className="meta">Renews {ymd(c.plan_renews)}</span></span>
                <span className="pill pill--warn">Renewal</span>
              </button></li>
            ))}
          </ul>
        </section>
      )}
      {d.files.length > 0 && (
        <section className="section">
          <h2>Files from clients (last 14 days)</h2>
          <ul className="list">{d.files.map((f) => (
            <li key={f.id}><button className="req" onClick={() => open(f.client_id, 'files')}>
              <span className="req__main"><span><b>{f.business}</b>: {f.name}</span><span className="meta">{bytes(f.size)} · {f.uploaded_by}</span></span>
              <span className="meta nowrap">{ago(f.created_at)}</span>
            </button></li>
          ))}</ul>
        </section>
      )}
      {waiting.length > 0 && <ReqList title="Waiting on the client" list={waiting} open={open} />}
      {approved.length > 0 && (
        <section className="section">
          <h2>Approved this week</h2>
          <ul className="list">{approved.map((a) => <li key={a.id} className="row-between"><span><b>{a.business}</b>: {a.title}</span><span className="pill pill--ok">Approved {ago(a.responded_at)}</span></li>)}</ul>
        </section>
      )}
    </div>
  )
}

function ReqList({ title, list, open }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      <ul className="list">{list.map((r) => {
        const [label, cls] = STATUS[r.status] || STATUS.open
        return (
          <li key={r.id}><button className="req" onClick={() => open(r.client_id, `requests/${r.id}`)}>
            <span className="req__main"><span><b>{r.business}</b></span><span className="clip2">{r.message}</span><span className="meta">{r.email} · asked {ago(r.created_at)}{r.last_msg ? ` · last message ${ago(r.last_msg)}` : ''}</span></span>
            <span className={`pill ${cls}`}>{label}</span>
          </button></li>
        )
      })}</ul>
    </section>
  )
}
