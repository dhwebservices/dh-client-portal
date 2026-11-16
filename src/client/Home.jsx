import { money, date, ago } from '../api'
import { BarChart } from '../ui'
import { STAGES } from './Project'

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

  return (
    <div className="stack">
      {!admin && <p className="lead">Hello{first ? ` ${first}` : ''}. Here’s how things stand for {client.business}.</p>}

      {todo.length > 0 && (
        <section className="section section--warn">
          <h2>{admin ? 'Waiting for the client' : 'Waiting for you'}</h2>
          <ul className="todo">
            {todo.map((t) => (
              <li key={t.key}><button className="todo__item" onClick={() => go(t.tab)}><span className={`dot dot--${t.tone}`} />{t.text}<span className="todo__go">→</span></button></li>
            ))}
          </ul>
        </section>
      )}

      <div className="kpis">
        <button className="kpi" onClick={() => go('website')}>
          <span className="kpi__label">Website</span>
          {client.site_url || client.preview_url ? (
            client.check_ok === 1
              ? <span className="kpi__value"><span className="dot dot--ok" />Up</span>
              : client.check_ok === 0 ? <span className="kpi__value"><span className="dot dot--red" />Not responding</span>
              : <span className="kpi__value">Checking…</span>
          ) : <span className="kpi__value kpi__value--muted">Not live yet</span>}
          <span className="meta">{client.check_ms && client.check_ok ? `Loaded in ${(client.check_ms / 1000).toFixed(1)}s` : client.site_url ? new URL(client.site_url).hostname : ' '}</span>
        </button>
        <button className="kpi" onClick={() => go('website')}>
          <span className="kpi__label">Visits this month</span>
          <span className="kpi__value">{stats.tracking || stats.this_month.views ? stats.this_month.views.toLocaleString('en-GB') : '–'}</span>
          <span className="meta">{stats.last_month.views ? `Last month: ${stats.last_month.views.toLocaleString('en-GB')}` : stats.tracking ? 'First month of stats' : 'Stats start once tracking is on'}</span>
        </button>
        <button className="kpi" onClick={() => go('website')}>
          <span className="kpi__label">Enquiries this month</span>
          <span className="kpi__value">{stats.tracking || stats.this_month.enquiries ? stats.this_month.enquiries : '–'}</span>
          <span className="meta">From your website’s contact form</span>
        </button>
        <button className="kpi" onClick={() => go('requests')}>
          <span className="kpi__label">Open requests</span>
          <span className="kpi__value">{requests.filter((r) => r.status !== 'done').length}</span>
          <span className="meta">{answered.length ? `${answered.length} with replies` : 'Ask us for any change'}</span>
        </button>
      </div>

      {stats.tracking && (
        <section className="section">
          <div className="section__top"><h2>Visits, last 30 days</h2><button className="link" onClick={() => go('website')}>More stats</button></div>
          <BarChart series={stats.series} />
        </section>
      )}

      <div className="two">
        <section className="section">
          <div className="section__top"><h2>Latest from us</h2>{updates.length > 1 && <button className="link" onClick={() => go('project')}>All updates</button>}</div>
          {client.status && <div className="status"><b>Now:</b><span className="pre">{client.status}</span></div>}
          {latest ? (
            <div style={{ marginTop: client.status ? 14 : 0 }}>
              <p className="pre">{latest.body}</p>
              <p className="meta" style={{ marginTop: 6 }}>{date(latest.created_at)}{latest.author ? ` · ${latest.author}` : ''}</p>
            </div>
          ) : !client.status && <p className="empty">Updates from David and Jack will show here.</p>}
        </section>
        <section className="section">
          <div className="section__top"><h2>Your project</h2><button className="link" onClick={() => go('project')}>Details</button></div>
          {stage ? (
            <>
              <p className="big">{stage.label}</p>
              <p className="meta">{stage.blurb}</p>
              <div className="progress" aria-label={`Step ${STAGES.indexOf(stage) + 1} of ${STAGES.length}`}>
                {STAGES.map((s, i) => <span key={s.key} className={i <= STAGES.indexOf(stage) ? 'on' : ''} />)}
              </div>
            </>
          ) : <p className="empty">We’ll set out the steps here when work starts.</p>}
          {client.plan && <p className="meta" style={{ marginTop: 12 }}>Plan: {client.plan}</p>}
        </section>
      </div>

      {requests.length > 0 && (
        <section className="section">
          <div className="section__top"><h2>Recent requests</h2><button className="link" onClick={() => go('requests')}>All requests</button></div>
          <ul className="list">
            {requests.slice(0, 3).map((r) => (
              <li key={r.id} className="row-between">
                <span className="clip">{r.message}</span>
                <span className="meta nowrap">{r.status === 'done' ? 'Done' : r.status === 'in_progress' ? 'In progress' : 'Received'} · {ago(r.last_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
