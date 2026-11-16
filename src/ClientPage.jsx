import { useEffect, useState } from 'react'
import { api, money, date, ymd } from './api'

const REQUEST_STATUS = { open: ['Received', ''], in_progress: ['In progress', 'pill--warn'], done: ['Done', 'pill--ok'] }

function invoiceState(inv) {
  if (inv.status === 'paid') return ['Paid', 'pill--ok']
  if (inv.due_date && new Date(`${inv.due_date}T23:59:59`) < new Date()) return ['Overdue', 'pill--red']
  return ['Due', 'pill--warn']
}

/**
 * One client's page. Clients see it for their own business; staff see the
 * same page with edit controls (admin = true).
 */
export default function ClientPage({ me, clientId, admin = false, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = () => api(`overview${clientId ? `?client=${clientId}` : ''}`).then(setData).catch((e) => setError(e.message))
  useEffect(() => { load() }, [clientId])

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="hint">Loading…</p>
  const { client, updates, requests, invoices, documents, people } = data
  const due = invoices.filter((i) => i.status === 'due')

  return (
    <>
      {onBack && <button className="link back" onClick={onBack}>← All clients</button>}
      <div className="page__head">
        <h1>{client.business}</h1>
        <p>{admin ? 'Staff view: you can edit everything on this page.' : `Hello${me?.name ? ` ${me.name.split(' ')[0]}` : ''}. This is everything for ${client.business} in one place.`}</p>
      </div>

      {due.length > 0 && !admin && (
        <div className="status" style={{ marginBottom: 18, background: 'var(--warn-soft)' }}>
          <b>{due.length === 1 ? '1 invoice' : `${due.length} invoices`} to pay</b>
          <span>{money(due.reduce((s, i) => s + i.amount_pence, 0))} in total. <a href="#invoices">See invoices</a></span>
        </div>
      )}

      <Website client={client} admin={admin} reload={load} />
      <Updates updates={updates} admin={admin} clientId={client.id} reload={load} />
      <Requests requests={requests} admin={admin} clientId={client.id} reload={load} />
      <Invoices invoices={invoices} admin={admin} clientId={client.id} reload={load} />
      <Documents documents={documents} admin={admin} clientId={client.id} reload={load} />
      {admin && <People people={people} clientId={client.id} reload={load} />}

      {!admin && (
        <p className="hint" style={{ marginTop: 28 }}>
          Anything else? Email <a href="mailto:clients@dhwebsiteservices.co.uk">clients@dhwebsiteservices.co.uk</a> or ring 01443 805303, Monday to Friday, 9 to 5.
        </p>
      )}
    </>
  )
}

function useForm(initial) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  return [form, set, setForm]
}

function Saver({ children, onSave, label = 'Save', reset }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(['', ''])
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(['', ''])
    try { await onSave(); setMsg(['done', 'Saved.']); reset?.() } catch (err) { setMsg(['error', err.message]) }
    setBusy(false)
  }
  return (
    <form onSubmit={submit}>
      {children}
      <button className="btn btn--small" disabled={busy}>{busy ? 'Saving…' : label}</button>
      {msg[1] && <p className={msg[0]} role="status">{msg[1]}</p>}
    </form>
  )
}

function Website({ client, admin, reload }) {
  const [editing, setEditing] = useState(false)
  const [form, set] = useForm({ business: client.business, site_url: client.site_url || '', preview_url: client.preview_url || '', status: client.status || '', plan: client.plan || '' })
  return (
    <section className="section">
      <div className="section__top">
        <h2>Your website</h2>
        {admin && <button className="link" onClick={() => setEditing(!editing)}>{editing ? 'Close' : 'Edit'}</button>}
      </div>
      <div className="site">
        {client.status && <div className="status"><b>Now:</b><span className="pre">{client.status}</span></div>}
        <div className="site__links">
          {client.site_url && <a className="btn" href={client.site_url} target="_blank" rel="noreferrer">Open your website</a>}
          {client.preview_url && <a className="btn btn--quiet" href={client.preview_url} target="_blank" rel="noreferrer">See the preview</a>}
        </div>
        {!client.site_url && !client.preview_url && <p className="empty">Your website link will appear here once it is live.</p>}
        {client.plan && <p className="hint">Plan: {client.plan}</p>}
      </div>
      {admin && editing && (
        <div className="edit">
          <Saver onSave={async () => { await api(`admin/clients/${client.id}`, { method: 'PATCH', body: form }); reload() }}>
            <div className="row">
              <div className="field"><label>Business</label><input value={form.business} onChange={set('business')} /></div>
              <div className="field"><label>Plan</label><input value={form.plan} onChange={set('plan')} placeholder="Care plan, £35 a month + VAT" /></div>
            </div>
            <div className="row">
              <div className="field"><label>Live site</label><input value={form.site_url} onChange={set('site_url')} placeholder="https://" /></div>
              <div className="field"><label>Preview link</label><input value={form.preview_url} onChange={set('preview_url')} placeholder="https://" /></div>
            </div>
            <div className="field"><label>What's happening now (shown at the top)</label><input value={form.status} onChange={set('status')} /></div>
          </Saver>
        </div>
      )}
    </section>
  )
}

function Updates({ updates, admin, clientId, reload }) {
  const [form, set, setForm] = useForm({ body: '' })
  if (!admin && updates.length === 0) return null
  return (
    <section className="section">
      <h2>Updates from us</h2>
      {updates.length === 0 ? <p className="empty">No updates posted yet.</p> : (
        <ul className="list">
          {updates.map((u) => (
            <li key={u.id}>
              <p className="pre">{u.body}</p>
              <p className="meta">{date(u.created_at)}{u.author ? ` · ${u.author}` : ''}</p>
            </li>
          ))}
        </ul>
      )}
      {admin && (
        <div className="edit">
          <Saver label="Post update" reset={() => setForm({ body: '' })} onSave={async () => { await api('admin/updates', { method: 'POST', body: { client: clientId, ...form } }); reload() }}>
            <div className="field"><label>New update for the client</label><textarea value={form.body} onChange={set('body')} /></div>
          </Saver>
        </div>
      )}
    </section>
  )
}

function Requests({ requests, admin, clientId, reload }) {
  const [form, set, setForm] = useForm({ message: '' })
  return (
    <section className="section" id="requests">
      <h2>{admin ? 'Change requests' : 'Ask for a change'}</h2>
      {!admin && (
        <Saver label="Send to DH" reset={() => setForm({ message: '' })} onSave={async () => { await api('requests', { method: 'POST', body: form }); reload() }}>
          <div className="field">
            <label htmlFor="msg">What would you like changing?</label>
            <textarea id="msg" value={form.message} onChange={set('message')} placeholder="For example: new opening hours from Monday, 11am to 11pm." />
          </div>
        </Saver>
      )}
      {requests.length > 0 && (
        <ul className="list" style={{ marginTop: admin ? 0 : 20 }}>
          {requests.map((r) => <RequestItem key={r.id} r={r} admin={admin} reload={reload} />)}
        </ul>
      )}
      {admin && requests.length === 0 && <p className="empty">No requests yet.</p>}
    </section>
  )
}

function RequestItem({ r, admin, reload }) {
  const [label, cls] = REQUEST_STATUS[r.status] || REQUEST_STATUS.open
  const [form, set] = useForm({ status: r.status, reply: r.reply || '' })
  const [open, setOpen] = useState(false)
  return (
    <li>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <p className="meta">{date(r.created_at)}{admin ? ` · ${r.email}` : ''}</p>
        <span className={`pill ${cls}`}>{label}</span>
      </div>
      <p className="pre" style={{ marginTop: 4 }}>{r.message}</p>
      {r.reply && <div className="reply"><p className="pre">{r.reply}</p><p className="meta">{r.replied_by}</p></div>}
      {admin && (
        <>
          <button className="link" style={{ marginTop: 8 }} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Reply / update'}</button>
          {open && (
            <div className="edit">
              <Saver onSave={async () => { await api(`admin/requests/${r.id}`, { method: 'PATCH', body: form }); reload() }}>
                <div className="field">
                  <label>Status</label>
                  <select value={form.status} onChange={set('status')}>
                    <option value="open">Received</option><option value="in_progress">In progress</option><option value="done">Done</option>
                  </select>
                </div>
                <div className="field"><label>Reply (the client sees this)</label><textarea value={form.reply} onChange={set('reply')} /></div>
              </Saver>
            </div>
          )}
        </>
      )}
    </li>
  )
}

function Invoices({ invoices, admin, clientId, reload }) {
  const blank = { number: '', description: '', amount: '', due_date: '', pay_url: '', file_url: '' }
  const [form, set, setForm] = useForm(blank)
  const [adding, setAdding] = useState(false)
  const mark = async (id, status) => { await api(`admin/invoices/${id}`, { method: 'PATCH', body: { status } }); reload() }
  return (
    <section className="section" id="invoices">
      <div className="section__top">
        <h2>Invoices</h2>
        {admin && <button className="link" onClick={() => setAdding(!adding)}>{adding ? 'Close' : 'Add invoice'}</button>}
      </div>
      {invoices.length === 0 ? <p className="empty">No invoices yet.</p> : (
        <ul className="list">
          {invoices.map((inv) => {
            const [label, cls] = invoiceState(inv)
            return (
              <li key={inv.id} className="inv">
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600 }}>{inv.description}</p>
                  <p className="meta">{inv.number ? `${inv.number} · ` : ''}{inv.status === 'paid' ? `Paid ${date(inv.paid_at)}` : inv.due_date ? `Due ${ymd(inv.due_date)}` : `Sent ${date(inv.created_at)}`}</p>
                </div>
                <div className="inv__amt">{money(inv.amount_pence)}</div>
                <div className="inv__act">
                  <span className={`pill ${cls}`}>{label}</span>
                  {inv.status === 'due' && inv.pay_url && <a className="btn btn--small" href={inv.pay_url} target="_blank" rel="noreferrer">Pay by card</a>}
                  {inv.file_url && <a className="link" href={inv.file_url} target="_blank" rel="noreferrer">View invoice</a>}
                  {admin && inv.status === 'due' && <button className="link" onClick={() => mark(inv.id, 'paid')}>Mark paid</button>}
                  {admin && <button className="link" style={{ color: 'var(--mid)' }} onClick={() => mark(inv.id, 'void')}>Remove</button>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {!admin && invoices.some((i) => i.status === 'due' && !i.pay_url) && (
        <p className="hint" style={{ marginTop: 14 }}>To pay by bank transfer, use the details on the invoice, or ring 01443 805303.</p>
      )}
      {admin && adding && (
        <div className="edit">
          <Saver label="Add invoice" reset={() => setForm(blank)} onSave={async () => { await api('admin/invoices', { method: 'POST', body: { client: clientId, ...form } }); reload() }}>
            <div className="field"><label>What it's for</label><input value={form.description} onChange={set('description')} placeholder="Website build: 50% deposit" /></div>
            <div className="row">
              <div className="field"><label>Amount to pay, inc. VAT (£)</label><input inputMode="decimal" value={form.amount} onChange={set('amount')} /></div>
              <div className="field"><label>Due date</label><input type="date" value={form.due_date} onChange={set('due_date')} /></div>
              <div className="field"><label>Invoice number</label><input value={form.number} onChange={set('number')} /></div>
            </div>
            <div className="row">
              <div className="field"><label>Pay-by-card link (optional)</label><input value={form.pay_url} onChange={set('pay_url')} placeholder="https://buy.stripe.com/…" /></div>
              <div className="field"><label>Invoice PDF link (optional)</label><input value={form.file_url} onChange={set('file_url')} placeholder="https://" /></div>
            </div>
          </Saver>
        </div>
      )}
    </section>
  )
}

function Documents({ documents, admin, clientId, reload }) {
  const [form, set, setForm] = useForm({ title: '', url: '' })
  if (!admin && documents.length === 0) return null
  return (
    <section className="section">
      <h2>Documents</h2>
      {documents.length === 0 ? <p className="empty">No documents yet.</p> : (
        <ul className="list">
          {documents.map((d) => (
            <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <a href={d.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{d.title}</a>
              <span className="meta" style={{ whiteSpace: 'nowrap' }}>
                {date(d.created_at)}
                {admin && <> · <button className="link" onClick={async () => { await api(`admin/documents/${d.id}`, { method: 'DELETE' }); reload() }}>Remove</button></>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {admin && (
        <div className="edit">
          <Saver label="Add document" reset={() => setForm({ title: '', url: '' })} onSave={async () => { await api('admin/documents', { method: 'POST', body: { client: clientId, ...form } }); reload() }}>
            <div className="row">
              <div className="field"><label>Name</label><input value={form.title} onChange={set('title')} placeholder="Website agreement" /></div>
              <div className="field"><label>Link</label><input value={form.url} onChange={set('url')} placeholder="https://" /></div>
            </div>
          </Saver>
        </div>
      )}
    </section>
  )
}

function People({ people, clientId, reload }) {
  const [form, set, setForm] = useForm({ email: '', name: '', invite: true })
  const [note, setNote] = useState('')
  return (
    <section className="section">
      <h2>Who can sign in</h2>
      {people.length === 0 ? <p className="empty">Nobody yet. Add the client's email below.</p> : (
        <ul className="list">
          {people.map((p) => (
            <li key={p.email} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ overflowWrap: 'anywhere' }}><strong>{p.name || p.email}</strong>{p.name ? <span className="meta"> · {p.email}</span> : null}</span>
              <span className="meta">
                {p.last_seen ? `Last in ${date(p.last_seen)}` : 'Not signed in yet'} · <button className="link" onClick={async () => { await api(`admin/people?email=${encodeURIComponent(p.email)}`, { method: 'DELETE' }); reload() }}>Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="edit">
        <Saver label="Add person" reset={() => setForm({ email: '', name: '', invite: true })} onSave={async () => {
          const r = await api('admin/people', { method: 'POST', body: { client: clientId, ...form } })
          setNote(form.invite ? (r.invited ? 'Invite email sent.' : 'Added, but the invite email did not send.') : '')
          reload()
        }}>
          <div className="row">
            <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} /></div>
            <div className="field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} /></div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400, marginBottom: 14 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.invite} onChange={set('invite')} /> Email them an invite now
          </label>
        </Saver>
        {note && <p className="done">{note}</p>}
      </div>
    </section>
  )
}
