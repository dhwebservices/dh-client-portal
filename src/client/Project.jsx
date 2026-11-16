import { useState } from 'react'
import { api, date, ago } from '../api'
import { Saver, useForm } from '../ui'

export const STAGES = [
  { key: 'brief', label: 'Brief', blurb: 'We agree what the site needs to do, and gather your words, photos and logo.' },
  { key: 'design', label: 'Design', blurb: 'We design the key pages and send them to you to approve.' },
  { key: 'build', label: 'Build', blurb: 'We build the full site on a private preview link.' },
  { key: 'review', label: 'Review', blurb: 'You check every page on the preview and tell us what to change.' },
  { key: 'launch', label: 'Launch', blurb: 'We connect your domain and put the site live.' },
  { key: 'live', label: 'Live', blurb: 'Your site is live. We look after it on your care plan.' },
]
const APPROVAL = { pending: ['Waiting for you', 'pill--warn'], approved: ['Approved', 'pill--ok'], changes: ['Changes asked for', 'pill--red'] }

export default function Project({ data, admin, clientId, reload }) {
  const { client, approvals, updates } = data
  const idx = STAGES.findIndex((s) => s.key === client.stage)

  const setStage = async (key) => {
    await api(`admin/clients/${clientId}`, { method: 'PATCH', body: { stage: key } })
    reload()
  }

  return (
    <div className="stack">
      <section className="section">
        <h2>Where we’re up to</h2>
        <ol className="timeline">
          {STAGES.map((s, i) => (
            <li key={s.key} className={i < idx ? 'is-done' : i === idx ? 'is-now' : ''}>
              <span className="timeline__dot">{i < idx ? '✓' : i + 1}</span>
              <div>
                <p className="timeline__label">{s.label}{i === idx && <span className="pill pill--warn" style={{ marginLeft: 8 }}>Now</span>}</p>
                <p className="meta">{s.blurb}</p>
                {i === idx && client.status && <p className="timeline__now"><b>Next:</b> {client.status}</p>}
              </div>
              {admin && i !== idx && <button className="link meta" onClick={() => setStage(s.key)}>Set</button>}
            </li>
          ))}
        </ol>
        {admin && <p className="hint">Changing the stage emails the client.</p>}
      </section>

      <section className="section" id="approvals">
        <h2>Designs to approve</h2>
        {approvals.length === 0 ? <p className="empty">{admin ? 'Nothing sent for approval yet.' : 'When we have a design or page for you to check, it’ll appear here.'}</p> : (
          <ul className="list">{approvals.map((a) => <Approval key={a.id} a={a} admin={admin} reload={reload} />)}</ul>
        )}
        {admin && <NewApproval clientId={clientId} reload={reload} />}
      </section>

      <section className="section">
        <h2>Updates from us</h2>
        {updates.length === 0 ? <p className="empty">No updates posted yet.</p> : (
          <ul className="list">
            {updates.map((u) => (
              <li key={u.id}>
                <p className="pre">{u.body}</p>
                <p className="meta" style={{ marginTop: 4 }}>{date(u.created_at)}{u.author ? ` · ${u.author}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
        {admin && <NewUpdate clientId={clientId} reload={reload} />}
      </section>
    </div>
  )
}

function Approval({ a, admin, reload }) {
  const [mode, setMode] = useState(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [label, cls] = APPROVAL[a.status]
  const answer = async (decision) => {
    setError('')
    try { await api(`approvals/${a.id}`, { method: 'POST', body: { decision, comment } }); setMode(null); reload() } catch (e) { setError(e.message) }
  }
  return (
    <li>
      <div className="row-between">
        <p style={{ fontWeight: 600 }}>{a.title}</p>
        <span className={`pill ${cls}`}>{label}</span>
      </div>
      {a.note && <p className="pre" style={{ marginTop: 4 }}>{a.note}</p>}
      <p className="meta" style={{ marginTop: 4 }}>Sent {date(a.created_at)}{a.created_by ? ` by ${a.created_by}` : ''}</p>
      {a.url && <a className="btn btn--quiet btn--small" style={{ marginTop: 10 }} href={a.url} target="_blank" rel="noreferrer">Open the design</a>}
      {a.status !== 'pending' && (
        <div className="reply"><p className="pre">{a.response || (a.status === 'approved' ? 'Approved.' : '')}</p><p className="meta">{a.responded_by} · {ago(a.responded_at)}</p></div>
      )}
      {!admin && a.status === 'pending' && (
        mode === 'changes' ? (
          <div className="edit">
            <div className="field"><label htmlFor={`c-${a.id}`}>What would you like changing?</label><textarea id={`c-${a.id}`} value={comment} onChange={(e) => setComment(e.target.value)} /></div>
            <button className="btn btn--small" onClick={() => answer('changes')}>Send</button>{' '}
            <button className="link" onClick={() => setMode(null)}>Cancel</button>
          </div>
        ) : (
          <div className="actions">
            <button className="btn btn--small" onClick={() => answer('approved')}>Approve</button>
            <button className="btn btn--quiet btn--small" onClick={() => setMode('changes')}>Ask for changes</button>
          </div>
        )
      )}
      {admin && <button className="link meta" style={{ marginTop: 8 }} onClick={async () => { await api(`admin/approvals/${a.id}`, { method: 'DELETE' }); reload() }}>Remove</button>}
      {error && <p className="error">{error}</p>}
    </li>
  )
}

function NewApproval({ clientId, reload }) {
  const blank = { title: '', url: '', note: '' }
  const [form, set, setForm] = useForm(blank)
  return (
    <div className="edit">
      <Saver label="Send for approval" reset={() => setForm(blank)} onSave={async () => { await api('admin/approvals', { method: 'POST', body: { client: clientId, ...form } }); reload() }}>
        <div className="row">
          <div className="field"><label>What is it?</label><input value={form.title} onChange={set('title')} placeholder="Home page design" /></div>
          <div className="field"><label>Link to it</label><input value={form.url} onChange={set('url')} placeholder="https://…preview link or Figma" /></div>
        </div>
        <div className="field"><label>Note for the client (optional)</label><textarea value={form.note} onChange={set('note')} placeholder="Colours are from your logo. Photos are placeholders until yours arrive." /></div>
      </Saver>
    </div>
  )
}

function NewUpdate({ clientId, reload }) {
  const [form, set, setForm] = useForm({ body: '' })
  return (
    <div className="edit">
      <Saver label="Post update" reset={() => setForm({ body: '' })} onSave={async () => { await api('admin/updates', { method: 'POST', body: { client: clientId, ...form } }); reload() }}>
        <div className="field"><label>New update (the client gets an email)</label><textarea value={form.body} onChange={set('body')} /></div>
      </Saver>
    </div>
  )
}
