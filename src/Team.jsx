import { useEffect, useState } from 'react'
import { api, date } from './api'

/** Who has the staff view. Everyone on staff can see it; only owners change it. */
export default function Team({ me }) {
  const [data, setData] = useState(null)
  const [form, setForm] = useState({ name: '', email: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(['', ''])

  const load = () => api('admin/team').then(setData).catch((e) => setMsg(['error', e.message]))
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(['', ''])
    try {
      await api('admin/team', { method: 'POST', body: form })
      setMsg(['done', `${form.name || form.email} can now sign in at app.dhwebsiteservices.co.uk with that email.`])
      setForm({ name: '', email: '' }); load()
    } catch (err) { setMsg(['error', err.message]) }
    setBusy(false)
  }

  const remove = async (email) => {
    try { await api(`admin/team?email=${encodeURIComponent(email)}`, { method: 'DELETE' }); load() } catch (err) { setMsg(['error', err.message]) }
  }

  if (!data) return msg[1] ? <p className="error">{msg[1]}</p> : <p className="hint">Loading…</p>

  return (
    <>
      <section className="section">
        <h2>Staff</h2>
        <p className="hint" style={{ marginBottom: 14 }}>Staff see every client and can edit everything. Owners can also add and remove staff.</p>
        <ul className="list">
          {data.owners.map((email) => (
            <li key={email} className="team-row">
              <span style={{ overflowWrap: 'anywhere' }}><strong>{email}</strong></span>
              <span className="pill">Owner</span>
            </li>
          ))}
          {data.staff.map((s) => (
            <li key={s.email} className="team-row">
              <span style={{ overflowWrap: 'anywhere' }}><strong>{s.name || s.email}</strong>{s.name ? <span className="meta"> · {s.email}</span> : null}</span>
              <span className="meta">
                {s.last_seen ? `Last in ${date(s.last_seen)}` : 'Not signed in yet'}
                {me.owner && <> · <button className="link" onClick={() => remove(s.email)}>Remove</button></>}
              </span>
            </li>
          ))}
        </ul>
        {me.owner ? (
          <form className="edit" onSubmit={add}>
            <div className="row">
              <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Email</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <button className="btn btn--small" disabled={busy}>{busy ? 'Adding…' : 'Add to staff'}</button>
          </form>
        ) : <p className="hint" style={{ marginTop: 14 }}>Ask an owner to add or remove staff.</p>}
        {msg[1] && <p className={msg[0]} role="status">{msg[1]}</p>}
      </section>
    </>
  )
}
