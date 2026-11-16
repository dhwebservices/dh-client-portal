import { useEffect, useState } from 'react'
import { api, date, ago } from '../api'
import { Saver, useForm } from '../ui'

/** Staff only: who can sign in for this client, private notes, and history. */
export default function Notes({ data, clientId, reload }) {
  const [activity, setActivity] = useState(null)
  useEffect(() => { api(`admin/activity?client=${clientId}`).then((r) => setActivity(r.activity)).catch(() => setActivity([])) }, [clientId, data])
  return (
    <div className="stack">
      <People people={data.people} clientId={clientId} reload={reload} />
      <section className="section staff-only">
        <h2>Private notes</h2>
        <p className="hint" style={{ marginBottom: 12 }}>Only staff can see these. Good for contacts, preferences and anything to remember. Don’t store passwords here.</p>
        {data.notes.length > 0 && (
          <ul className="list" style={{ marginBottom: 12 }}>
            {data.notes.map((n) => (
              <li key={n.id}>
                <p className="pre">{n.body}</p>
                <p className="meta" style={{ marginTop: 4 }}>{n.author} · {date(n.created_at)} · <button className="link" onClick={async () => { await api(`admin/notes/${n.id}`, { method: 'DELETE' }); reload() }}>Delete</button></p>
              </li>
            ))}
          </ul>
        )}
        <NewNote clientId={clientId} reload={reload} />
      </section>
      <section className="section staff-only">
        <h2>History</h2>
        {activity === null ? <p className="hint">Loading…</p> : activity.length === 0 ? <p className="empty">Nothing yet.</p> : (
          <ul className="log">{activity.map((a) => <li key={a.id}><span><b>{a.actor}</b> {a.action.charAt(0).toLowerCase() + a.action.slice(1)}</span><span className="meta nowrap">{ago(a.created_at)}</span></li>)}</ul>
        )}
      </section>
    </div>
  )
}

function NewNote({ clientId, reload }) {
  const [form, set, setForm] = useForm({ body: '' })
  return (
    <Saver label="Add note" quiet reset={() => setForm({ body: '' })} onSave={async () => { await api('admin/notes', { method: 'POST', body: { client: clientId, ...form } }); reload() }}>
      <div className="field"><textarea aria-label="New note" value={form.body} onChange={set('body')} /></div>
    </Saver>
  )
}

function People({ people, clientId, reload }) {
  const [form, set, setForm] = useForm({ email: '', name: '', invite: true })
  const [note, setNote] = useState('')
  return (
    <section className="section staff-only">
      <h2>Who can sign in</h2>
      {people.length === 0 ? <p className="empty">Nobody yet. Add the client’s email below.</p> : (
        <ul className="list">
          {people.map((p) => (
            <li key={p.email} className="row-between">
              <span style={{ overflowWrap: 'anywhere' }}><strong>{p.name || p.email}</strong>{p.name ? <span className="meta"> · {p.email}</span> : null}</span>
              <span className="meta">
                {p.last_seen ? `Last in ${ago(p.last_seen)}` : 'Not signed in yet'}{p.notify === 0 ? ' · emails off' : ''} · <button className="link" onClick={async () => { await api(`admin/people?email=${encodeURIComponent(p.email)}`, { method: 'DELETE' }); reload() }}>Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="edit">
        <Saver label="Add person" quiet reset={() => setForm({ email: '', name: '', invite: true })} onSave={async () => {
          const r = await api('admin/people', { method: 'POST', body: { client: clientId, ...form } })
          setNote(form.invite ? (r.invited ? 'Added, and the invite email has gone.' : 'Added, but the invite email did not send.') : 'Added.')
          reload()
        }}>
          <div className="row">
            <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} /></div>
            <div className="field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} /></div>
          </div>
          <label className="check"><input type="checkbox" checked={form.invite} onChange={set('invite')} /> <span>Email them an invite now</span></label>
        </Saver>
        {note && <p className="done">{note}</p>}
      </div>
    </section>
  )
}
