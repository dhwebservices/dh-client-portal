import { useEffect, useState } from 'react'
import { api } from './api'
import ClientPage from './ClientPage'

export default function Staff({ me }) {
  const [clients, setClients] = useState(null)
  const [open, setOpen] = useState(null)
  const [adding, setAdding] = useState(false)
  const [business, setBusiness] = useState('')
  const [error, setError] = useState('')

  const load = () => api('admin/clients').then((r) => setClients(r.clients)).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  if (open) return <ClientPage me={me} clientId={open} admin onBack={() => { setOpen(null); load() }} />

  const add = async (e) => {
    e.preventDefault(); setError('')
    try {
      const r = await api('admin/clients', { method: 'POST', body: { business } })
      setBusiness(''); setAdding(false); setOpen(r.id)
    } catch (err) { setError(err.message) }
  }

  return (
    <>
      <div className="page__head">
        <h1>Clients</h1>
        <p>Signed in as staff. Pick a client to see their page exactly as they do, with edit controls.</p>
      </div>
      {clients === null ? <p className="hint">Loading…</p> : (
        <ul className="clients">
          {clients.map((c) => (
            <li key={c.id}>
              <button onClick={() => setOpen(c.id)}>
                <span><strong>{c.business}</strong><br /><span className="meta">{c.people} {c.people === 1 ? 'person' : 'people'} can sign in</span></span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {c.open_requests > 0 && <span className="pill pill--red">{c.open_requests} open</span>}
                  {c.due_invoices > 0 && <span className="pill pill--warn">{c.due_invoices} due</span>}
                </span>
              </button>
            </li>
          ))}
          {clients.length === 0 && <li className="empty">No clients yet.</li>}
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
        {error && <p className="error">{error}</p>}
      </div>
    </>
  )
}
