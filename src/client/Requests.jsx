import { useEffect, useState } from 'react'
import { api, date, ago } from '../api'
import { Uploader, FileGrid } from '../ui'

export const STATUS = { open: ['Received', ''], in_progress: ['In progress', 'pill--warn'], done: ['Done', 'pill--ok'] }

// Ready-made forms for the changes clients ask for most.
const QUICK = [
  { kind: 'hours', label: 'Opening hours', fields: [['when', 'From when?', 'date'], ['hours', 'New hours', 'textarea', 'Mon–Fri 9am–5pm\nSat 10am–4pm\nSun closed']], build: (f) => `Please update our opening hours${f.when ? ` from ${f.when}` : ''}:\n${f.hours}` },
  { kind: 'offer', label: 'Offer or news', fields: [['title', 'Headline', 'text', 'Two for Tuesday: any two mains £20'], ['details', 'Details', 'textarea'], ['until', 'Show it until', 'date']], build: (f) => `Please add this to the website:\n${f.title}\n${f.details}${f.until ? `\nTake it down after ${f.until}.` : ''}` },
  { kind: 'menu', label: 'Menu or prices', fields: [['details', 'What’s changing?', 'textarea', 'Add: Fish & chips £13.50\nRemove: Lasagne\nBurger now £12']], build: (f) => `Menu / price changes:\n${f.details}` },
  { kind: 'photos', label: 'New photos', fields: [['details', 'Where should they go?', 'textarea', 'Swap the main photo on the home page for the new one']], build: (f) => `New photos attached.\n${f.details}`, needsFiles: true },
  { kind: 'other', label: 'Something else', fields: [['details', 'What would you like changing?', 'textarea', 'For example: add our new phone number to every page']], build: (f) => f.details },
]

export default function Requests({ data, admin, clientId, reload }) {
  const [open, setOpen] = useState(() => (location.hash.match(/requests\/([\w-]{36})/) || [])[1] || null)
  const [quick, setQuick] = useState(null)
  const [filter, setFilter] = useState('active')
  const list = data.requests.filter((r) => (filter === 'active' ? r.status !== 'done' : filter === 'done' ? r.status === 'done' : true))

  if (open) return <Thread id={open} admin={admin} clientId={clientId} onBack={() => { setOpen(null); reload() }} />

  return (
    <div className="stack">
      {!admin && (
        <section className="section">
          <h2>Ask for a change</h2>
          <p className="hint" style={{ marginBottom: 12 }}>Pick one, fill it in, and it comes straight to David and Jack.</p>
          <div className="chips">
            {QUICK.map((q) => <button key={q.kind} className={`chip${quick?.kind === q.kind ? ' is-on' : ''}`} onClick={() => setQuick(quick?.kind === q.kind ? null : q)}>{q.label}</button>)}
          </div>
          {quick && <QuickForm key={quick.kind} q={quick} clientId={clientId} onSent={(id) => { setQuick(null); reload(); setOpen(id) }} />}
        </section>
      )}

      <section className="section">
        <div className="section__top">
          <h2>{admin ? 'Change requests' : 'Your requests'}</h2>
          <div className="seg" role="group" aria-label="Show">
            {[['active', 'Open'], ['done', 'Done'], ['all', 'All']].map(([k, t]) => <button key={k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>{t}</button>)}
          </div>
        </div>
        {list.length === 0 ? <p className="empty">{filter === 'active' ? 'Nothing open right now.' : 'Nothing here yet.'}</p> : (
          <ul className="list">
            {list.map((r) => {
              const [label, cls] = STATUS[r.status] || STATUS.open
              return (
                <li key={r.id}>
                  <button className="req" onClick={() => { location.hash = `${admin ? `c/${clientId}/` : ''}requests/${r.id}`; setOpen(r.id) }}>
                    <span className="req__main">
                      <span className="clip2">{r.message}</span>
                      <span className="meta">{date(r.created_at)}{admin ? ` · ${r.email}` : ''}{r.messages ? ` · ${r.messages} ${r.messages === 1 ? 'reply' : 'replies'}` : ''} · updated {ago(r.last_at)}</span>
                    </span>
                    <span className={`pill ${cls}`}>{label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function QuickForm({ q, clientId, onSent }) {
  const [f, setF] = useState({})
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const send = async (e) => {
    e.preventDefault(); setError('')
    if (q.needsFiles && !files.length) return setError('Add the photos first.')
    const message = q.build(f).trim()
    if (message.length < 3) return setError('Fill in the details first.')
    setBusy(true)
    try { const r = await api('requests', { method: 'POST', body: { message, kind: q.kind, files: files.map((x) => x.id) } }); onSent(r.id) } catch (err) { setError(err.message) }
    setBusy(false)
  }
  return (
    <form className="edit" onSubmit={send}>
      {q.fields.map(([k, label, type, ph]) => (
        <div className="field" key={k}>
          <label htmlFor={`q-${k}`}>{label}</label>
          {type === 'textarea'
            ? <textarea id={`q-${k}`} placeholder={ph} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            : <input id={`q-${k}`} type={type} placeholder={ph} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
        </div>
      ))}
      <div className="field">
        <label>{q.needsFiles ? 'Photos' : 'Attach anything useful (optional)'}</label>
        <Uploader clientId={clientId} label={q.needsFiles ? 'Add photos' : 'Attach files'} onDone={(d) => setFiles((x) => [...x, ...d])} />
        {files.length > 0 && <p className="meta" style={{ marginTop: 6 }}>Attached: {files.map((x) => x.name).join(', ')}</p>}
      </div>
      <button className="btn btn--small" disabled={busy}>{busy ? 'Sending…' : 'Send to DH'}</button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}

function Thread({ id, admin, clientId, onBack }) {
  const [t, setT] = useState(null)
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = () => api(`requests/${id}/messages`).then((d) => { setT(d); setStatus(d.request.status) }).catch((e) => setError(e.message))
  useEffect(() => { load() }, [id])
  const back = () => { location.hash = `${admin ? `c/${clientId}/` : ''}requests`; onBack() }

  if (error && !t) return <p className="error">{error}</p>
  if (!t) return <p className="hint">Loading…</p>
  const r = t.request
  const [label, cls] = STATUS[r.status] || STATUS.open
  // Replies written before threads existed live on the request itself.
  const msgs = [...(r.reply ? [{ id: 'legacy', staff: 1, name: r.replied_by, body: r.reply, created_at: r.updated_at || r.created_at }] : []), ...t.messages]

  const send = async (e) => {
    e.preventDefault(); setError('')
    if (!text.trim() && !(admin && status !== r.status) && !files.length) return
    setBusy(true)
    try {
      await api(`requests/${id}/messages`, { method: 'POST', body: { body: text || (files.length ? `Added ${files.map((f) => f.name).join(', ')}` : ''), status: admin ? status : undefined, files: files.map((f) => f.id) } })
      setText(''); setFiles([]); await load()
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  return (
    <div className="stack">
      <button className="link back" onClick={back}>← All requests</button>
      <section className="section">
        <div className="section__top"><h2>Change request</h2><span className={`pill ${cls}`}>{label}</span></div>
        <div className="thread">
          <div className="msg msg--client">
            <p className="pre">{r.message}</p>
            <p className="meta">{r.email} · {date(r.created_at)}</p>
          </div>
          {msgs.map((m) => (
            <div key={m.id} className={`msg ${m.staff ? 'msg--us' : 'msg--client'}`}>
              <p className="pre">{m.body}</p>
              <p className="meta">{m.staff ? `${m.name || 'DH'} · DH Website Services` : m.name || m.email} · {ago(m.created_at)}</p>
            </div>
          ))}
        </div>
        {t.files.length > 0 && <div style={{ marginTop: 16 }}><h3 className="h3">Files</h3><FileGrid files={t.files} /></div>}
        <form className="edit" onSubmit={send}>
          <div className="field">
            <label htmlFor="reply">{admin ? 'Reply to the client' : 'Add a message'}</label>
            <textarea id="reply" value={text} onChange={(e) => setText(e.target.value)} placeholder={admin ? 'They get an email to say you replied.' : r.status === 'done' ? 'Writing here reopens the request.' : ''} />
          </div>
          <div className="row-between" style={{ alignItems: 'center', marginBottom: 12 }}>
            <Uploader compact clientId={clientId} label="Attach files" onDone={(d) => setFiles((x) => [...x, ...d])} />
            {admin && (
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 'auto' }} aria-label="Status">
                <option value="open">Received</option><option value="in_progress">In progress</option><option value="done">Done</option>
              </select>
            )}
          </div>
          {files.length > 0 && <p className="meta" style={{ marginBottom: 10 }}>Attaching: {files.map((x) => x.name).join(', ')}</p>}
          <button className="btn btn--small" disabled={busy}>{busy ? 'Sending…' : admin ? 'Send reply' : 'Send'}</button>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
    </div>
  )
}
