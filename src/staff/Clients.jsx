import { useEffect, useState } from 'react'
import { api } from '../api'
import { STAGES } from '../client/Project'

export default function Clients({ open }) {
  const [d, setD] = useState(null)
  const [adding, setAdding] = useState(false)
  const [business, setBusiness] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { api('admin/clients').then(setD).catch((e) => setError(e.message)) }, [])

  const add = async (e) => {
    e.preventDefault(); setError('')
    try { const r = await api('admin/clients', { method: 'POST', body: { business } }); open(r.id) } catch (err) { setError(err.message) }
  }
  const list = (d?.clients || []).filter((c) => c.business.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <div className="page__head row-between" style={{ alignItems: 'flex-end' }}>
        <div><h1>Clients</h1><p>Open a client to see their area exactly as they do, with edit controls.</p></div>
        {d && d.clients.length > 6 && <input className="search" placeholder="Find a client" value={q} onChange={(e) => setQ(e.target.value)} />}
      </div>
      {!d ? <p className="hint">{error || 'Loading…'}</p> : (
        <ul className="clients">
          {list.map((c) => {
            const stage = STAGES.find((s) => s.key === c.stage)
            return (
              <li key={c.id}>
                <button onClick={() => open(c.id)}>
                  <span style={{ minWidth: 0 }}>
                    <strong>{c.business}</strong><br />
                    <span className="meta">
                      {c.check_ok === 0 ? <><span className="dot dot--red" />Site down · </> : c.check_ok === 1 ? <><span className="dot dot--ok" />Up · </> : null}
                      {stage ? stage.label : 'No stage set'} · {c.people} {c.people === 1 ? 'person' : 'people'}
                    </span>
                  </span>
                  <span className="pills">
                    {c.open_requests > 0 && <span className="pill pill--red">{c.open_requests} open</span>}
                    {c.pending_approvals > 0 && <span className="pill">{c.pending_approvals} to approve</span>}
                    {c.due_invoices > 0 && <span className="pill pill--warn">{c.due_invoices} due</span>}
                  </span>
                </button>
              </li>
            )
          })}
          {list.length === 0 && <li className="empty">{q ? 'No match.' : 'No clients yet.'}</li>}
        </ul>
      )}
      <div style={{ marginTop: 18 }}>
        {adding ? (
          <form onSubmit={add} className="section">
            <div className="field"><label>Business name</label><input autoFocus value={business} onChange={(e) => setBusiness(e.target.value)} /></div>
            <button className="btn btn--small">Add client</button>{' '}
            <button type="button" className="link" onClick={() => setAdding(false)}>Cancel</button>
          </form>
        ) : <button className="btn btn--quiet" onClick={() => setAdding(true)}>Add a client</button>}
        {error && d && <p className="error">{error}</p>}
      </div>
    </>
  )
}
