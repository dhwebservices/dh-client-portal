import { money, date, ago } from '../api'
import { BarChart } from '../ui'
import { STAGES } from './Project'
import { useEffect, useRef } from 'react'

// Their real site, drawn at desktop width (1280px) and scaled down to fit the frame.
function FrameView({ src, title }) {
  const box = useRef(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => el.style.setProperty('--s', String(el.clientWidth / 1280))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <span className="frame__view" ref={box}>
      <iframe src={src} title={title} loading="lazy" tabIndex={-1} sandbox="allow-scripts allow-same-origin" />
    </span>
  )
}

/** The first screen: is my site OK, how is it doing, and what needs me. */
export default function Home({ me, data, admin, go }) {
  const { client, stats, updates, requests, invoices, approvals } = data
  const due = invoices.filter((i) => i.status === 'due')
  const pending = approvals.filter((a) => a.status === 'pending')
  const answered = requests.filter((r) => r.status !== 'done' && r.messages > 0)
  const latest = updates[0]
  const stage = STAGES.find((s) => s.key === client.stage)
  const first = me?.name ? me.name.split(' ')[0] : ''

  const todo = [
    ...due.map((i) => ({ key: i.id, text: `Pay ${money(i.amount_pence)}: ${i.description}`, tab: 'billing', tone: i.due_date && new Date(`${i.due_date}T23:59:59`) < new Date() ? 'red' : 'warn' })),
    ...pending.map((a) => ({ key: a.id, text: `Take a look and approve: ${a.title}`, tab: 'project', tone: 'warn' })),
  ]

  const site = client.site_url || client.preview_url
  const host = site ? new URL(site).hostname.replace(/^www\./, '') : ''
  const hour = new Date().getHours()
  const hello = `${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}${first ? `, ${first}` : ''}`
  const idx = STAGES.indexOf(stage)
  const isLive = client.stage === 'live' || (!stage && client.site_url)
  const headline = isLive
    ? client.check_ok === 0 ? 'Your website isn’t responding.' : 'Your website is up and running.'
    : stage ? `We’re at the ${stage.label.toLowerCase()} stage.` : 'Welcome to your client area.'
  const views = stats.this_month.views
  const change = stats.last_month.views ? Math.round(((views - stats.last_month.views) / stats.last_month.views) * 100) : null

  return (
    <div className="stack">
      <section className={`hero${site ? '' : ' hero--solo'}`}>
        <div className="hero__text">
          <span className="eyebrow eyebrow--light">{admin ? client.business : hello}</span>
          <h1>{headline}</h1>
          <p className="hero__status">
            {site && (client.check_ok === 1 ? <><span className="dot dot--ok" />Checked {client.check_at ? ago(client.check_at) : 'recently'}{client.check_ms ? `, loaded in ${(client.check_ms / 1000).toFixed(1)}s` : ''}</>
              : client.check_ok === 0 ? <><span className="dot dot--red" />If it stays down, ring us on 01443 805303.</> : null)}
            {!site && stage && stage.blurb}
          </p>
          {client.status && <p className="hero__now"><b>Now</b>{client.status}</p>}
          <div className="hero__actions">
            {client.site_url && <a className="btn" href={client.site_url} target="_blank" rel="noreferrer">Open {host}</a>}
            {!client.site_url && client.preview_url && <a className="btn" href={client.preview_url} target="_blank" rel="noreferrer">See the preview</a>}
            <button className="btn btn--ghost" onClick={() => go('requests')}>Ask for a change</button>
          </div>
        </div>
        {site && (
          <a className="frame" href={site} target="_blank" rel="noreferrer" aria-label={`Open ${host}`}>
            <span className="frame__bar"><i /><i /><i /><span>{host}</span></span>
            <FrameView src={site} title={`${host}, live`} />
          </a>
        )}
      </section>

      {todo.length > 0 && (
        <section className="todo-card">
          <h2>{admin ? 'Waiting for the client' : 'Waiting for you'}<span className="todo-card__n">{todo.length}</span></h2>
          <ul className="todo">
            {todo.map((t) => (
              <li key={t.key}><button className="todo__item" onClick={() => go(t.tab)}><span className={`dot dot--${t.tone}`} />{t.text}<span className="todo__go">→</span></button></li>
            ))}
          </ul>
        </section>
      )}

      <div className="figures">
        <button className="figure" onClick={() => go('website')}>
          <span className="figure__v">{stats.tracking || views ? views.toLocaleString('en-GB') : '–'}</span>
          <span className="figure__l">visits this month</span>
          <span className="meta">{change === null ? (stats.tracking ? 'First month of stats' : 'Stats start once tracking is on') : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% on last month (${stats.last_month.views.toLocaleString('en-GB')})`}</span>
        </button>
        <button className="figure" onClick={() => go('website')}>
          <span className="figure__v">{stats.tracking || stats.this_month.enquiries ? stats.this_month.enquiries : '–'}</span>
          <span className="figure__l">enquiries this month</span>
          <span className="meta">From your website’s contact form</span>
        </button>
        <button className="figure" onClick={() => go('requests')}>
          <span className="figure__v">{requests.filter((r) => r.status !== 'done').length}</span>
          <span className="figure__l">open requests</span>
          <span className="meta">{answered.length ? `${answered.length} with replies from us` : 'Ask us for any change'}</span>
        </button>
      </div>

      {stats.tracking && (
        <section className="section">
          <div className="section__top"><h2>Visits, last 30 days</h2><button className="link" onClick={() => go('website')}>More stats →</button></div>
          <BarChart series={stats.series} />
        </section>
      )}

      {stage && (
        <section className="section">
          <div className="section__top"><h2>Your project</h2><button className="link" onClick={() => go('project')}>Details →</button></div>
          <ol className="journey" aria-label={`Step ${idx + 1} of ${STAGES.length}`}>
            {STAGES.map((s, i) => (
              <li key={s.key} className={i < idx ? 'is-done' : i === idx ? 'is-now' : ''}>
                <span className="journey__n">{i < idx ? '✓' : String(i + 1).padStart(2, '0')}</span>
                <span className="journey__l">{s.label}</span>
              </li>
            ))}
          </ol>
          <p className="meta" style={{ marginTop: 12 }}>{stage.blurb}{client.plan ? ` · Plan: ${client.plan}` : ''}</p>
        </section>
      )}

      <div className="two">
        <section className="section">
          <div className="section__top"><h2>Latest from us</h2>{updates.length > 1 && <button className="link" onClick={() => go('project')}>All updates →</button>}</div>
          {latest ? (
            <div className="note">
              <span className="avatar">{(latest.author || 'DH').slice(0, 1)}</span>
              <div>
                <p className="pre">{latest.body}</p>
                <p className="meta" style={{ marginTop: 6 }}>{latest.author || 'DH'} · {date(latest.created_at)}</p>
              </div>
            </div>
          ) : <p className="empty">Updates from David and Jack will show here.</p>}
        </section>
        <section className="section">
          <div className="section__top"><h2>Recent requests</h2><button className="link" onClick={() => go('requests')}>All requests →</button></div>
          {requests.length ? (
            <ul className="list">
              {requests.slice(0, 3).map((r) => (
                <li key={r.id} className="row-between">
                  <span className="clip">{r.message}</span>
                  <span className={`pill ${r.status === 'done' ? 'pill--ok' : r.status === 'in_progress' ? 'pill--warn' : ''}`}>{r.status === 'done' ? 'Done' : r.status === 'in_progress' ? 'In progress' : 'Received'}</span>
                </li>
              ))}
            </ul>
          ) : <p className="empty">Need something changed? <button className="link" onClick={() => go('requests')}>Ask us</button> and we’ll reply here.</p>}
        </section>
      </div>
    </div>
  )
}
