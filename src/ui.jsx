import { useEffect, useRef, useState } from 'react'
import { upload, fileUrl, bytes, date } from './api'

export function useForm(initial) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  return [form, set, setForm]
}

export function Saver({ children, onSave, label = 'Save', reset, quiet }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(['', ''])
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(['', ''])
    try { await onSave(); if (!quiet) setMsg(['done', 'Saved.']); reset?.() } catch (err) { setMsg(['error', err.message]) }
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

// Tabs that live in the address bar (#home, #files…) so Back works.
export function useHashTab(prefix, tabs, fallback) {
  const read = () => {
    const h = decodeURIComponent(location.hash.slice(1))
    const rest = prefix ? (h.startsWith(prefix) ? h.slice(prefix.length) : '') : h
    const t = rest.split('/')[0]
    return tabs.includes(t) ? t : fallback
  }
  const [tab, setTab] = useState(read)
  useEffect(() => {
    const on = () => setTab(read())
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [prefix])
  const go = (t) => { location.hash = `${prefix}${t}`; setTab(t); scrollTo(0, 0) }
  return [tab, go]
}

export function Tabs({ tabs, tab, go, label }) {
  return (
    <div className="tabs-scroll">
      <nav className="tabs" aria-label={label}>
        {tabs.map(([key, text, badge]) => (
          <button key={key} className={tab === key ? 'is-on' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => go(key)}>
            {text}{badge ? <span className="tabs__badge">{badge}</span> : null}
          </button>
        ))}
      </nav>
    </div>
  )
}

// Bar chart drawn to scale: every bar uses the same y scale, labels sit on real values.
export function BarChart({ series, field = 'views', height = 140 }) {
  const max = Math.max(1, ...series.map((d) => d[field]))
  const nice = max <= 5 ? 5 : max <= 10 ? 10 : Math.ceil(max / 10) * 10
  const w = 100 / series.length
  return (
    <figure className="chart">
      <div className="chart__axis"><span>{nice}</span><span>{nice / 2}</span><span>0</span></div>
      <div className="chart__plot" style={{ height }}>
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
          {[0, 0.5, 1].map((f) => <line key={f} x1="0" x2="100" y1={height * f} y2={height * f} className="chart__grid" />)}
          {series.map((d, i) => {
            const h = (d[field] / nice) * height
            return <rect key={d.day} x={i * w + w * 0.18} width={w * 0.64} y={height - h} height={h} className={d[field] ? 'chart__bar' : ''} />
          })}
        </svg>
      </div>
      <figcaption className="chart__x"><span>{shortDay(series[0]?.day)}</span><span>{shortDay(series[series.length - 1]?.day)}</span></figcaption>
    </figure>
  )
}
const shortDay = (s) => (s ? new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')

// Pick or drop files; uploads straight away and hands back the uploaded files.
export function Uploader({ clientId, announce, onDone, label = 'Add files', compact }) {
  const [busy, setBusy] = useState([])
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)
  const input = useRef(null)
  const take = async (list) => {
    setError('')
    const files = [...list]
    const done = []
    for (const f of files) {
      setBusy((b) => [...b, { name: f.name, p: 0 }])
      try {
        const r = await upload(f, clientId, { announce, onProgress: (p) => setBusy((b) => b.map((x) => (x.name === f.name ? { ...x, p } : x))) })
        done.push(r)
      } catch (e) { setError(e.message) }
      setBusy((b) => b.filter((x) => x.name !== f.name))
    }
    if (done.length) onDone?.(done)
  }
  return (
    <div
      className={`drop${over ? ' is-over' : ''}${compact ? ' drop--compact' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files) }}
    >
      <input ref={input} type="file" multiple hidden onChange={(e) => { take(e.target.files); e.target.value = '' }}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" />
      <button type="button" className="btn btn--quiet btn--small" onClick={() => input.current.click()}>{label}</button>
      {!compact && <span className="meta">or drag them here. Photos, PDFs, Word, Excel; up to 10 MB each.</span>}
      {busy.map((b) => <div key={b.name} className="drop__bar"><span>{b.name}</span><progress max="1" value={b.p} /></div>)}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

const isImage = (t) => /^image\/(jpeg|png|webp|gif)$/.test(t)

export function FileGrid({ files, canRemove, onRemove, empty = 'No files yet.' }) {
  if (!files.length) return <p className="empty">{empty}</p>
  return (
    <ul className="files">
      {files.map((f) => (
        <li key={f.id} className="file">
          <a className="file__thumb" href={fileUrl(f.id)} target="_blank" rel="noreferrer">
            {isImage(f.type) ? <img src={fileUrl(f.id)} alt="" loading="lazy" /> : <span>{(f.name.split('.').pop() || 'file').slice(0, 4).toUpperCase()}</span>}
          </a>
          <div className="file__info">
            <a href={fileUrl(f.id, true)} className="file__name">{f.name}</a>
            <span className="meta">{bytes(f.size)} · {date(f.created_at)}{f.uploaded_by ? ` · ${f.uploaded_by}` : ''}</span>
            {canRemove?.(f) && <button className="link meta" onClick={() => onRemove(f)}>Remove</button>}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Empty({ title, children }) {
  return <div className="empty-card"><p className="empty-card__title">{title}</p>{children && <p className="meta">{children}</p>}</div>
}
