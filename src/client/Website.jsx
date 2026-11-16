import { useEffect, useState } from 'react'
import { api, ago } from '../api'
import { BarChart, Saver, useForm } from '../ui'

export default function Website({ data, admin, clientId, reload }) {
  const { client } = data
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState(data.stats)
  useEffect(() => {
    if (days === 30) { setStats(data.stats); return }
    api(`stats?client=${clientId}&days=${days}`).then(setStats).catch(() => {})
  }, [days, data.stats])
  const live = client.site_url || client.preview_url
  const total = stats.series.reduce((s, d) => s + d.views, 0)
  const enq = stats.series.reduce((s, d) => s + d.enquiries, 0)
  const topViews = Math.max(1, ...stats.pages.map((p) => p.views))
  const topSrc = Math.max(1, ...stats.sources.map((p) => p.views))

  return (
    <div className="stack">
      <section className="section">
        <h2>Your website</h2>
        {live ? (
          <div className="site">
            <div className="row-between">
              <span>
                {client.check_ok === 1 ? <><span className="dot dot--ok" /><b>Up and running</b></> : client.check_ok === 0 ? <><span className="dot dot--red" /><b>Not responding</b> <span className="meta">If it stays down, ring us on 01443 805303.</span></> : <b>Checking…</b>}
              </span>
              {client.check_ms && client.check_ok ? <span className="meta">Loaded in {(client.check_ms / 1000).toFixed(1)}s{admin && client.check_at ? ` · checked ${ago(client.check_at)}` : ''}</span> : null}
            </div>
            <div className="site__links">
              {client.site_url && <a className="btn" href={client.site_url} target="_blank" rel="noreferrer">Open your website</a>}
              {client.preview_url && <a className="btn btn--quiet" href={client.preview_url} target="_blank" rel="noreferrer">See the preview</a>}
            </div>
          </div>
        ) : <p className="empty">Your website link will appear here once it is live.</p>}
      </section>

      <section className="section">
        <div className="section__top">
          <h2>Visits</h2>
          <div className="seg" role="group" aria-label="Period">
            {[30, 90, 365].map((d) => <button key={d} className={days === d ? 'is-on' : ''} onClick={() => setDays(d)}>{d === 365 ? '12 months' : `${d} days`}</button>)}
          </div>
        </div>
        {stats.tracking || total ? (
          <>
            <div className="nums">
              <div><span className="nums__v">{total.toLocaleString('en-GB')}</span><span className="meta">page views</span></div>
              <div><span className="nums__v">{enq}</span><span className="meta">enquiries</span></div>
              <div><span className="nums__v">{Math.round(total / days)}</span><span className="meta">a day on average</span></div>
            </div>
            <BarChart series={stats.series} />
          </>
        ) : <p className="empty">Visit stats start the day we switch tracking on for your site. No cookies, and nothing personal is collected.</p>}
      </section>

      {(stats.pages.length > 0 || stats.sources.length > 0) && (
        <div className="two">
          <section className="section">
            <h2>Most visited pages</h2>
            <p className="meta" style={{ marginBottom: 10 }}>This month</p>
            <ul className="bars">{stats.pages.map((p) => <li key={p.path}><span className="clip">{p.path}</span><span className="bars__n">{p.views}</span><i style={{ width: `${(p.views / topViews) * 100}%` }} /></li>)}</ul>
          </section>
          <section className="section">
            <h2>Where visitors came from</h2>
            <p className="meta" style={{ marginBottom: 10 }}>This month</p>
            <ul className="bars">{stats.sources.map((p) => <li key={p.source}><span className="clip">{p.source}</span><span className="bars__n">{p.views}</span><i style={{ width: `${(p.views / topSrc) * 100}%` }} /></li>)}</ul>
          </section>
        </div>
      )}

      {admin && <EditClient client={client} reload={reload} />}
      {admin && <Tracking client={client} />}
    </div>
  )
}

function EditClient({ client, reload }) {
  const [form, set] = useForm({ business: client.business, site_url: client.site_url || '', preview_url: client.preview_url || '', status: client.status || '', plan: client.plan || '', plan_renews: client.plan_renews || '', stage: client.stage || 'brief' })
  return (
    <section className="section staff-only">
      <h2>Client details</h2>
      <Saver onSave={async () => { await api(`admin/clients/${client.id}`, { method: 'PATCH', body: form }); reload() }}>
        <div className="row">
          <div className="field"><label>Business</label><input value={form.business} onChange={set('business')} /></div>
          <div className="field"><label>Live site</label><input value={form.site_url} onChange={set('site_url')} placeholder="https://" /></div>
          <div className="field"><label>Preview link</label><input value={form.preview_url} onChange={set('preview_url')} placeholder="https://" /></div>
        </div>
        <div className="row">
          <div className="field"><label>Plan</label><input value={form.plan} onChange={set('plan')} placeholder="Care plan, £35 a month + VAT" /></div>
          <div className="field"><label>Plan renews</label><input type="date" value={form.plan_renews} onChange={set('plan_renews')} /></div>
        </div>
        <div className="field"><label>“Now” line (top of Home)</label><input value={form.status} onChange={set('status')} placeholder="Building the menu page; preview by Friday" /></div>
        <p className="hint" style={{ marginBottom: 12 }}>Project stage is set on the Project tab.</p>
      </Saver>
    </section>
  )
}

function Tracking({ client }) {
  const snippet = `<script defer src="https://app.dhwebsiteservices.co.uk/t.js" data-site="${client.site_key}"></script>`
  const [copied, setCopied] = useState(false)
  const copy = () => navigator.clipboard?.writeText(snippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  return (
    <section className="section staff-only">
      <h2>Switch on visit stats</h2>
      <p className="hint" style={{ marginBottom: 10 }}>Put this before <code>&lt;/head&gt;</code> on the client’s site. To count enquiries, add <code>data-dh-enquiry</code> to the contact form, or call <code>dhEnquiry()</code> when it sends. No cookies, so no cookie banner needed.</p>
      <pre className="code">{snippet}</pre>
      <button className="btn btn--quiet btn--small" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
    </section>
  )
}
