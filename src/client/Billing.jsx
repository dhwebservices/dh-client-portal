import { useState } from 'react'
import { api, money, date, ymd } from '../api'
import { Saver, useForm } from '../ui'

function invoiceState(inv) {
  if (inv.status === 'paid') return ['Paid', 'pill--ok']
  if (inv.due_date && new Date(`${inv.due_date}T23:59:59`) < new Date()) return ['Overdue', 'pill--red']
  return ['Due', 'pill--warn']
}

export default function Billing({ data, admin, clientId, reload }) {
  const { client, invoices } = data
  const due = invoices.filter((i) => i.status === 'due')
  const paid = invoices.filter((i) => i.status === 'paid')
  const year = new Date().getFullYear()
  const paidThisYear = paid.filter((i) => new Date(i.paid_at).getFullYear() === year).reduce((s, i) => s + i.amount_pence, 0)

  return (
    <div className="stack">
      <div className="kpis kpis--3">
        <div className="kpi"><span className="kpi__label">To pay</span><span className="kpi__value">{money(due.reduce((s, i) => s + i.amount_pence, 0))}</span><span className="meta">{due.length ? `${due.length} ${due.length === 1 ? 'invoice' : 'invoices'}` : 'All paid up'}</span></div>
        <div className="kpi"><span className="kpi__label">Paid in {year}</span><span className="kpi__value">{money(paidThisYear)}</span><span className="meta">VAT included</span></div>
        <div className="kpi"><span className="kpi__label">Your plan</span><span className="kpi__value kpi__value--sm">{client.plan || '–'}</span><span className="meta">{client.plan_renews ? `Renews ${ymd(client.plan_renews)}` : ' '}</span></div>
      </div>

      <section className="section">
        <h2>To pay</h2>
        {due.length === 0 ? <p className="empty">Nothing to pay right now.</p> : <InvoiceList list={due} admin={admin} reload={reload} />}
        {!admin && due.some((i) => !i.pay_url) && <p className="hint" style={{ marginTop: 14 }}>To pay by bank transfer, use the details on the invoice, or ring 01443 805303.</p>}
        {admin && <NewInvoice clientId={clientId} reload={reload} />}
      </section>

      <section className="section">
        <h2>Paid</h2>
        {paid.length === 0 ? <p className="empty">Paid invoices and receipts will be kept here.</p> : <InvoiceList list={paid} admin={admin} reload={reload} />}
      </section>

      {!admin && client.plan && (
        <section className="section">
          <h2>About your care plan</h2>
          <p className="hint">Your plan covers hosting, the security certificate, backups and updates for your website. The notice period and any minimum term are in your agreement. To change your plan, email us or ring 01443 805303.</p>
        </section>
      )}
    </div>
  )
}

function InvoiceList({ list, admin, reload }) {
  const mark = async (id, status) => { await api(`admin/invoices/${id}`, { method: 'PATCH', body: { status } }); reload() }
  return (
    <ul className="list">
      {list.map((inv) => {
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
              {inv.file_url && <a className="link" href={inv.file_url} target="_blank" rel="noreferrer">{inv.status === 'paid' ? 'Receipt / invoice' : 'View invoice'}</a>}
              {admin && inv.status === 'due' && <button className="link" onClick={() => mark(inv.id, 'paid')}>Mark paid</button>}
              {admin && inv.status === 'paid' && <button className="link" onClick={() => mark(inv.id, 'due')}>Mark unpaid</button>}
              {admin && <button className="link" style={{ color: 'var(--mid)' }} onClick={() => mark(inv.id, 'void')}>Remove</button>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function NewInvoice({ clientId, reload }) {
  const blank = { number: '', description: '', amount: '', due_date: '', pay_url: '', file_url: '' }
  const [form, set, setForm] = useForm(blank)
  const [open, setOpen] = useState(false)
  if (!open) return <button className="link" style={{ marginTop: 14 }} onClick={() => setOpen(true)}>Add invoice</button>
  return (
    <div className="edit">
      <Saver label="Add invoice" reset={() => setForm(blank)} onSave={async () => { await api('admin/invoices', { method: 'POST', body: { client: clientId, ...form } }); reload() }}>
        <div className="field"><label>What it’s for</label><input value={form.description} onChange={set('description')} placeholder="Website build: 50% deposit" /></div>
        <div className="row">
          <div className="field"><label>Amount to pay, inc. VAT (£)</label><input inputMode="decimal" value={form.amount} onChange={set('amount')} /></div>
          <div className="field"><label>Due date</label><input type="date" value={form.due_date} onChange={set('due_date')} /></div>
          <div className="field"><label>Invoice number</label><input value={form.number} onChange={set('number')} /></div>
        </div>
        <div className="row">
          <div className="field"><label>Pay-by-card link (optional)</label><input value={form.pay_url} onChange={set('pay_url')} placeholder="https://buy.stripe.com/…" /></div>
          <div className="field"><label>Invoice PDF link (optional)</label><input value={form.file_url} onChange={set('file_url')} placeholder="https://" /></div>
        </div>
        <p className="hint" style={{ marginBottom: 12 }}>The client gets an email about it.</p>
      </Saver>
      <button className="link" onClick={() => setOpen(false)}>Close</button>
    </div>
  )
}
