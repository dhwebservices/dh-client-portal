// DH client area API.
//
// Sign-in is an emailed 6-digit code: no passwords, no Microsoft account.
// Clients see only their own business. Staff see every client and can edit.
// Owners (OWNERS in wrangler.toml) are staff who can also add and remove
// staff on the Team page; other staff live in the staff table. All data is in
// this project's private D1 database.

const DAY = 86400000
const MB = 1024 * 1024
const MAX_FILE = 10 * MB
const CHUNK = MB
const STAGES = ['brief', 'design', 'build', 'review', 'launch', 'live']
// Served from our own origin, so nothing that can run script (no HTML, no SVG).
const FILE_TYPES = {
  'image/jpeg': 1, 'image/png': 1, 'image/webp': 1, 'image/gif': 1, 'image/heic': 1, 'image/heif': 1,
  'application/pdf': 1, 'text/plain': 0, 'text/csv': 0,
  'application/msword': 0, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 0,
  'application/vnd.ms-excel': 0, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 0,
  'application/vnd.ms-powerpoint': 0, 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 0,
  'application/zip': 0,
}
const EXT_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', zip: 'application/zip' }

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } })
class Err extends Error { constructor(status, msg) { super(msg); this.status = status } }

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const sha = async (v) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)))
const token = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)))
const code6 = () => { let n; do { n = crypto.getRandomValues(new Uint32Array(1))[0] } while (n >= 4e9); return String(n % 1e6).padStart(6, '0') }
const cookie = (req, name) => (req.headers.get('cookie') || '').split(';').map((c) => c.trim().split('=')).find(([k]) => k === name)?.[1]
const COOKIE = 'dhc_session'
const setCookie = (v, maxAge) => `${COOKIE}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)
const clean = (s, max = 2000) => String(s ?? '').trim().slice(0, max)
const url = (s) => { const v = clean(s, 500); if (!v) return null; if (!/^https:\/\//i.test(v)) throw new Err(400, 'Links must start with https://'); return v }
const ymdOf = (ms) => new Date(ms).toISOString().slice(0, 10)
const monthOf = (ms) => new Date(ms).toISOString().slice(0, 7)

async function body(req) { try { return await req.json() } catch { return {} } }
const owners = (env) => String(env.OWNERS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
const nameFrom = (email) => email.split('@')[0].replace(/^./, (c) => c.toUpperCase())
const staffRow = (env, email) => env.DB.prepare('SELECT * FROM staff WHERE email = ?').bind(email).first()
const isStaff = async (env, email) => owners(env).includes(email) || !!(await staffRow(env, email))

async function whoAmI(req, env) {
  const t = cookie(req, COOKIE)
  if (!t) return null
  const s = await env.DB.prepare('SELECT email FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(await sha(t), Date.now()).first()
  if (!s) return null
  if (owners(env).includes(s.email)) return { email: s.email, admin: true, owner: true, name: nameFrom(s.email) }
  const st = await staffRow(env, s.email)
  if (st) {
    await env.DB.prepare('UPDATE staff SET last_seen = ? WHERE email = ?').bind(Date.now(), st.email).run()
    return { email: st.email, admin: true, owner: false, name: st.name || nameFrom(st.email) }
  }
  const p = await env.DB.prepare('SELECT * FROM people WHERE email = ?').bind(s.email).first()
  if (!p) return null
  await env.DB.prepare('UPDATE people SET last_seen = ? WHERE email = ?').bind(Date.now(), p.email).run()
  return { email: p.email, admin: false, name: p.name, client_id: p.client_id, notify: p.notify !== 0 }
}

// Queue a one-time job and ask the main site to send it (see MAIL_RELAY).
async function mail(env, request, template, to, data) {
  const id = token(24)
  await env.DB.prepare('INSERT INTO mail_jobs (id, template, recipient, data, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, template, to, JSON.stringify(data), Date.now()).run()
  const origin = new URL(request.url).origin
  const app = /\.dh-client-portal\.pages\.dev$/.test(new URL(request.url).hostname) ? origin : undefined
  const r = await fetch(env.MAIL_RELAY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ job: id, app }) })
  return r.ok
}

const clientFor = async (env, user, requested) => {
  const id = user.admin ? requested : user.client_id
  if (!id) throw new Err(400, 'Pick a client.')
  const c = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first()
  if (!c) throw new Err(404, 'No such client.')
  return c
}

const log = (env, user, clientId, action) => env.DB.prepare('INSERT INTO activity (client_id, actor, staff, action, created_at) VALUES (?, ?, ?, ?, ?)')
  .bind(clientId || null, user.name || user.email, user.admin ? 1 : 0, action.slice(0, 300), Date.now()).run()

// Email everyone at the client who wants updates. Runs after the response.
function notifyClient(ctx, c, kind, title, text = '') {
  ctx.waitUntil((async () => {
    const { results } = await ctx.env.DB.prepare('SELECT email, name FROM people WHERE client_id = ? AND notify != 0').bind(c.id).all()
    for (const p of results) await mail(ctx.env, ctx.request, 'notify', p.email, { kind, business: c.business, name: p.name || '', title: clean(title, 140), text: clean(text, 600) }).catch(() => {})
  })())
}
// Tell our own inbox something happened on the client side.
function alertUs(ctx, user, c, what, text = '') {
  ctx.waitUntil(mail(ctx.env, ctx.request, 'alert', null, { who: user.name || user.email, email: user.email, business: c.business, what: clean(what, 140), text: clean(text, 2000) }).catch(() => {}))
}

// Up/down check, at most every 10 minutes per client.
async function checkSite(env, c) {
  const target = c.site_url || c.preview_url
  if (!target || (c.check_at && c.check_at > Date.now() - 10 * 60000)) return c
  const t0 = Date.now()
  let ok = 0
  try {
    const r = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'DH-client-area-uptime/1.0' } })
    ok = r.status < 400 ? 1 : 0
  } catch { ok = 0 }
  const ms = Date.now() - t0
  await env.DB.prepare('UPDATE clients SET check_at = ?, check_ok = ?, check_ms = ? WHERE id = ?').bind(Date.now(), ok, ms, c.id).run()
  return { ...c, check_at: Date.now(), check_ok: ok, check_ms: ms }
}

async function stats(env, clientId, days = 30) {
  const now = Date.now()
  const from = ymdOf(now - (days - 1) * DAY)
  const thisMonth = monthOf(now)
  const lastMonthDate = new Date(now); lastMonthDate.setUTCDate(1); lastMonthDate.setUTCMonth(lastMonthDate.getUTCMonth() - 1)
  const lastMonth = monthOf(lastMonthDate.getTime())
  const [daily, months, pages, refs] = await Promise.all([
    env.DB.prepare('SELECT day, views, enquiries FROM pv_daily WHERE client_id = ? AND day >= ? ORDER BY day').bind(clientId, from).all(),
    env.DB.prepare("SELECT substr(day, 1, 7) AS month, SUM(views) AS views, SUM(enquiries) AS enquiries FROM pv_daily WHERE client_id = ? AND substr(day, 1, 7) IN (?, ?) GROUP BY month").bind(clientId, thisMonth, lastMonth).all(),
    env.DB.prepare('SELECT path, views FROM pv_pages WHERE client_id = ? AND month = ? ORDER BY views DESC LIMIT 8').bind(clientId, thisMonth).all(),
    env.DB.prepare('SELECT source, views FROM pv_refs WHERE client_id = ? AND month = ? ORDER BY views DESC LIMIT 8').bind(clientId, thisMonth).all(),
  ])
  const byDay = Object.fromEntries(daily.results.map((r) => [r.day, r]))
  const series = []
  for (let i = days - 1; i >= 0; i--) { const d = ymdOf(now - i * DAY); series.push({ day: d, views: byDay[d]?.views || 0, enquiries: byDay[d]?.enquiries || 0 }) }
  const m = Object.fromEntries(months.results.map((r) => [r.month, r]))
  return {
    series,
    this_month: { views: m[thisMonth]?.views || 0, enquiries: m[thisMonth]?.enquiries || 0 },
    last_month: { views: m[lastMonth]?.views || 0, enquiries: m[lastMonth]?.enquiries || 0 },
    pages: pages.results, sources: refs.results,
    tracking: daily.results.length > 0,
  }
}

const fileRow = (f) => ({ id: f.id, name: f.name, type: f.type, size: f.size, uploaded_by: f.uploaded_by, staff: f.staff, request_id: f.request_id, created_at: f.created_at })

export async function onRequest(ctx) {
  const { request, env, params } = ctx
  const path = (Array.isArray(params.route) ? params.route : [params.route]).filter(Boolean).join('/')
  const method = request.method
  const q = new URL(request.url).searchParams
  try {
    // ---------------- relay pickup: each job once, within two minutes
    const job = path.match(/^mail-job\/([a-f0-9]{48})$/)
    if (job && method === 'GET') {
      const row = await env.DB.prepare('DELETE FROM mail_jobs WHERE id = ? AND created_at > ? RETURNING template, recipient, data').bind(job[1], Date.now() - 120000).first()
      if (!row) throw new Err(404, 'No such job.')
      return json({ template: row.template, to: row.recipient, data: JSON.parse(row.data) })
    }

    // ---------------- stats beacon from client websites (public/t.js)
    if (path === 'hit') {
      const cors = { 'access-control-allow-origin': '*' }
      if (method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type' } })
      if (method !== 'POST') throw new Err(405, 'POST only.')
      if (/bot|crawl|spider|slurp|headless|lighthouse|preview|monitor/i.test(request.headers.get('user-agent') || '')) return new Response(null, { status: 204, headers: cors })
      let b = {}
      try { b = JSON.parse((await request.text()).slice(0, 2000)) } catch { /* ignore */ }
      const c = /^[a-f0-9]{16}$/.test(String(b.k || '')) && await env.DB.prepare('SELECT id, site_url, preview_url FROM clients WHERE site_key = ?').bind(b.k).first()
      if (!c) return new Response(null, { status: 204, headers: cors })
      const now = Date.now()
      const day = ymdOf(now), month = monthOf(now)
      if (b.e === 'enquiry') {
        await env.DB.prepare('INSERT INTO pv_daily (client_id, day, enquiries) VALUES (?, ?, 1) ON CONFLICT(client_id, day) DO UPDATE SET enquiries = enquiries + 1').bind(c.id, day).run()
        return new Response(null, { status: 204, headers: cors })
      }
      const p = (String(b.p || '/').split(/[?#]/)[0] || '/').slice(0, 200)
      let source = 'Direct'
      try {
        const rh = new URL(String(b.r || '')).hostname.replace(/^www\./, '')
        const own = [c.site_url, c.preview_url].filter(Boolean).map((u) => new URL(u).hostname.replace(/^www\./, ''))
        if (rh && !own.includes(rh)) source = /google\./.test(rh) ? 'Google' : /facebook\.|fb\.|instagram\./.test(rh) ? 'Facebook / Instagram' : /bing\./.test(rh) ? 'Bing' : rh.slice(0, 80)
        else if (rh) source = null
      } catch { /* no referrer: direct */ }
      const stmts = [
        env.DB.prepare('INSERT INTO pv_daily (client_id, day, views) VALUES (?, ?, 1) ON CONFLICT(client_id, day) DO UPDATE SET views = views + 1').bind(c.id, day),
        env.DB.prepare('INSERT INTO pv_pages (client_id, month, path, views) VALUES (?, ?, ?, 1) ON CONFLICT(client_id, month, path) DO UPDATE SET views = views + 1').bind(c.id, month, p),
      ]
      if (source) stmts.push(env.DB.prepare('INSERT INTO pv_refs (client_id, month, source, views) VALUES (?, ?, ?, 1) ON CONFLICT(client_id, month, source) DO UPDATE SET views = views + 1').bind(c.id, month, source))
      await env.DB.batch(stmts)
      return new Response(null, { status: 204, headers: cors })
    }

    // Writes need this header, which a cross-site form can't send.
    if (method !== 'GET' && request.headers.get('x-dhc') !== '1') throw new Err(400, 'Bad request.')

    // ---------------- sign-in
    if (path === 'auth/start' && method === 'POST') {
      const email = clean((await body(request)).email, 200).toLowerCase()
      if (!isEmail(email)) throw new Err(400, 'Enter your email address.')
      const known = await isStaff(env, email) || await env.DB.prepare('SELECT 1 FROM people WHERE email = ?').bind(email).first()
      // Same answer either way, so the form can't be used to test addresses.
      if (!known) return json({ ok: true })
      const now = Date.now()
      const c = await env.DB.prepare('SELECT * FROM codes WHERE email = ?').bind(email).first()
      if (c?.locked_until > now) throw new Err(429, 'Too many wrong codes. Try again in 15 minutes.')
      if (c?.last_sent > now - 45000) return json({ ok: true })
      const code = code6()
      await env.DB.prepare('INSERT INTO codes (email, code_hash, expires_at, attempts, last_sent) VALUES (?, ?, ?, 0, ?) ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, last_sent = excluded.last_sent')
        .bind(email, await sha(`${email}:${code}`), now + 10 * 60000, now).run()
      if (env.DEV_ECHO === '1' && new URL(request.url).hostname === 'localhost') return json({ ok: true, dev_code: code })
      if (!await mail(env, request, 'code', email, { code })) throw new Err(502, 'We could not send the code. Please try again, or ring 01443 805303.')
      return json({ ok: true })
    }

    if (path === 'auth/verify' && method === 'POST') {
      const b = await body(request)
      const email = clean(b.email, 200).toLowerCase()
      const code = String(b.code || '').replace(/\D/g, '')
      const c = await env.DB.prepare('SELECT * FROM codes WHERE email = ?').bind(email).first()
      const now = Date.now()
      if (c?.locked_until > now) throw new Err(429, 'Too many wrong codes. Try again in 15 minutes.')
      if (!c || !c.code_hash || c.expires_at < now) throw new Err(400, 'That code has run out. Ask for a new one.')
      if (c.code_hash !== await sha(`${email}:${code}`)) {
        const attempts = c.attempts + 1
        await env.DB.prepare('UPDATE codes SET attempts = ?, locked_until = ?, code_hash = CASE WHEN ? >= 5 THEN NULL ELSE code_hash END WHERE email = ?').bind(attempts, attempts >= 5 ? now + 15 * 60000 : null, attempts, email).run()
        throw new Err(400, attempts >= 5 ? 'Too many wrong codes. Try again in 15 minutes.' : `That code isn't right. ${5 - attempts} ${5 - attempts === 1 ? 'try' : 'tries'} left.`)
      }
      await env.DB.prepare('UPDATE codes SET code_hash = NULL, attempts = 0 WHERE email = ?').bind(email).run()
      const t = token()
      await env.DB.prepare('INSERT INTO sessions (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)').bind(await sha(t), email, now, now + 30 * DAY).run()
      await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run()
      return json({ ok: true }, 200, { 'set-cookie': setCookie(t, 30 * 86400) })
    }

    if (path === 'auth/signout' && method === 'POST') {
      const t = cookie(request, COOKIE)
      if (t) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha(t)).run()
      return json({ ok: true }, 200, { 'set-cookie': setCookie('', 0) })
    }

    // ---------------- signed in
    const user = await whoAmI(request, env)
    if (!user) throw new Err(401, 'Please sign in.')

    if (path === 'me' && method === 'GET') {
      const client = user.admin ? null : await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(user.client_id).first()
      return json({ ...user, client })
    }

    if (path === 'me/settings' && method === 'PATCH') {
      if (user.admin) throw new Err(400, 'Staff settings are on the Team page.')
      const b = await body(request)
      await env.DB.prepare('UPDATE people SET notify = ?, name = COALESCE(?, name) WHERE email = ?').bind(b.notify ? 1 : 0, clean(b.name, 100) || null, user.email).run()
      return json({ ok: true })
    }

    // Everything a client sees, in one call.
    if (path === 'overview' && method === 'GET') {
      let c = await clientFor(env, user, q.get('client'))
      c = await checkSite(env, c)
      const [updates, requests, msgs, invoices, documents, files, approvals, people, notes, st] = await Promise.all([
        env.DB.prepare('SELECT * FROM updates WHERE client_id = ? ORDER BY created_at DESC LIMIT 50').bind(c.id).all(),
        env.DB.prepare('SELECT * FROM requests WHERE client_id = ? ORDER BY created_at DESC LIMIT 100').bind(c.id).all(),
        env.DB.prepare('SELECT request_id, COUNT(*) AS n, MAX(created_at) AS last_at FROM request_messages WHERE client_id = ? GROUP BY request_id').bind(c.id).all(),
        env.DB.prepare("SELECT * FROM invoices WHERE client_id = ? AND status != 'void' ORDER BY created_at DESC").bind(c.id).all(),
        env.DB.prepare('SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC').bind(c.id).all(),
        env.DB.prepare('SELECT * FROM files WHERE client_id = ? ORDER BY created_at DESC LIMIT 200').bind(c.id).all(),
        env.DB.prepare('SELECT * FROM approvals WHERE client_id = ? ORDER BY created_at DESC').bind(c.id).all(),
        user.admin ? env.DB.prepare('SELECT email, name, last_seen, notify FROM people WHERE client_id = ? ORDER BY created_at').bind(c.id).all() : Promise.resolve({ results: [] }),
        user.admin ? env.DB.prepare('SELECT * FROM notes WHERE client_id = ? ORDER BY created_at DESC').bind(c.id).all() : Promise.resolve({ results: [] }),
        stats(env, c.id, 30),
      ])
      const m = Object.fromEntries(msgs.results.map((r) => [r.request_id, r]))
      const reqs = requests.results.map((r) => ({ ...r, messages: m[r.id]?.n || 0, last_at: Math.max(r.updated_at || 0, m[r.id]?.last_at || 0, r.created_at) }))
      if (!user.admin) delete c.check_at
      return json({ client: c, updates: updates.results, requests: reqs, invoices: invoices.results, documents: documents.results, files: files.results.map(fileRow), approvals: approvals.results, people: people.results, notes: notes.results, stats: st })
    }

    if (path === 'stats' && method === 'GET') {
      const c = await clientFor(env, user, q.get('client'))
      const days = Math.min(Math.max(Number(q.get('days')) || 30, 7), 365)
      return json(await stats(env, c.id, days))
    }

    // ---------------- change requests and their threads
    if (path === 'requests' && method === 'POST') {
      const b = await body(request)
      const c = await clientFor(env, user, b.client)
      const message = clean(b.message, 4000)
      if (message.length < 3) throw new Err(400, 'Tell us what you need changing.')
      const kind = ['hours', 'offer', 'menu', 'photos', 'other'].includes(b.kind) ? b.kind : 'other'
      const id = crypto.randomUUID()
      await env.DB.prepare('INSERT INTO requests (id, client_id, email, message, kind, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, c.id, user.email, message, kind, Date.now()).run()
      const fileIds = (Array.isArray(b.files) ? b.files : []).filter((f) => /^[\w-]{36}$/.test(f)).slice(0, 20)
      for (const f of fileIds) await env.DB.prepare('UPDATE files SET request_id = ? WHERE id = ? AND client_id = ?').bind(id, f, c.id).run()
      await log(env, user, c.id, 'Asked for a change')
      if (!user.admin) ctx.waitUntil(mail(env, request, 'request', null, { name: user.name, email: user.email, business: c.business, message }).catch(() => {}))
      return json({ ok: true, id })
    }

    const thread = path.match(/^requests\/([\w-]{36})\/messages$/)
    if (thread) {
      const r = await env.DB.prepare('SELECT * FROM requests WHERE id = ?').bind(thread[1]).first()
      if (!r) throw new Err(404, 'No such request.')
      const c = await clientFor(env, user, r.client_id)
      if (c.id !== r.client_id) throw new Err(404, 'No such request.')
      if (method === 'GET') {
        const [m, f] = await Promise.all([
          env.DB.prepare('SELECT id, email, name, staff, body, created_at FROM request_messages WHERE request_id = ? ORDER BY created_at').bind(r.id).all(),
          env.DB.prepare('SELECT * FROM files WHERE request_id = ? ORDER BY created_at').bind(r.id).all(),
        ])
        return json({ request: r, messages: m.results, files: f.results.map(fileRow) })
      }
      if (method === 'POST') {
        const b = await body(request)
        const text = clean(b.body, 4000)
        const status = user.admin && ['open', 'in_progress', 'done'].includes(b.status) ? b.status : null
        if (!text && !status) throw new Err(400, 'Write a message.')
        const now = Date.now()
        if (text) await env.DB.prepare('INSERT INTO request_messages (id, request_id, client_id, email, name, staff, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), r.id, c.id, user.email, user.name || null, user.admin ? 1 : 0, text, now).run()
        // A client writing on a finished request reopens it.
        const next = status || (!user.admin && r.status === 'done' ? 'open' : r.status)
        await env.DB.prepare('UPDATE requests SET status = ?, updated_at = ? WHERE id = ?').bind(next, now, r.id).run()
        const fileIds = (Array.isArray(b.files) ? b.files : []).filter((f) => /^[\w-]{36}$/.test(f)).slice(0, 20)
        for (const f of fileIds) await env.DB.prepare('UPDATE files SET request_id = ? WHERE id = ? AND client_id = ?').bind(r.id, f, c.id).run()
        const label = { open: 'Received', in_progress: 'In progress', done: 'Done' }
        await log(env, user, c.id, text ? `Replied on a change request${status && status !== r.status ? ` (now ${label[status]})` : ''}` : `Marked a change request ${label[status]}`)
        if (user.admin) notifyClient(ctx, c, 'reply', status === 'done' && r.status !== 'done' ? 'Your change is done' : 'We replied to your change request', text || `Status: ${label[next]}`)
        else alertUs(ctx, user, c, 'replied on a change request', text)
        return json({ ok: true })
      }
    }

    // ---------------- files
    if (path === 'files' && method === 'POST') {
      const c = await clientFor(env, user, q.get('client'))
      const name = clean(decodeURIComponent(request.headers.get('x-file-name') || ''), 180).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_') || 'file'
      const ext = (name.split('.').pop() || '').toLowerCase()
      let type = String(request.headers.get('content-type') || '').split(';')[0].toLowerCase()
      if (!(type in FILE_TYPES)) type = EXT_TYPES[ext] || ''
      if (!type) throw new Err(415, 'That kind of file can’t be uploaded. Photos, PDFs, Word, Excel and zip files are fine.')
      const buf = await request.arrayBuffer()
      if (!buf.byteLength) throw new Err(400, 'The file is empty.')
      if (buf.byteLength > MAX_FILE) throw new Err(413, 'Files can be up to 10 MB. For bigger ones, send us a link.')
      const id = crypto.randomUUID()
      const chunks = Math.ceil(buf.byteLength / CHUNK)
      const stmts = [env.DB.prepare('INSERT INTO files (id, client_id, name, type, size, chunks, uploaded_by, staff, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, c.id, name, type, buf.byteLength, chunks, user.name || user.email, user.admin ? 1 : 0, Date.now())]
      for (let i = 0; i < chunks; i++) stmts.push(env.DB.prepare('INSERT INTO file_chunks (file_id, idx, data) VALUES (?, ?, ?)').bind(id, i, buf.slice(i * CHUNK, (i + 1) * CHUNK)))
      await env.DB.batch(stmts)
      await log(env, user, c.id, `Uploaded ${name}`)
      if (q.get('announce') === '1') {
        if (user.admin) notifyClient(ctx, c, 'file', `New file: ${name}`)
        else alertUs(ctx, user, c, `uploaded a file: ${name}`)
      }
      return json({ ok: true, file: { id, name, type, size: buf.byteLength } })
    }

    const fileOne = path.match(/^files\/([\w-]{36})$/)
    if (fileOne) {
      const f = await env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(fileOne[1]).first()
      if (!f) throw new Err(404, 'No such file.')
      const c = await clientFor(env, user, f.client_id)
      if (c.id !== f.client_id) throw new Err(404, 'No such file.')
      if (method === 'GET') {
        const { results } = await env.DB.prepare('SELECT data FROM file_chunks WHERE file_id = ? ORDER BY idx').bind(f.id).all()
        const parts = results.map((r) => new Uint8Array(r.data))
        const inline = FILE_TYPES[f.type] === 1 && q.get('download') !== '1'
        return new Response(new Blob(parts, { type: f.type }), {
          headers: {
            'content-type': f.type,
            'content-disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
            'x-content-type-options': 'nosniff',
            'content-security-policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
            'cache-control': 'private, max-age=3600',
          },
        })
      }
      if (method === 'DELETE') {
        if (!user.admin && f.staff) throw new Err(403, 'Only DH can remove files we added.')
        await env.DB.batch([
          env.DB.prepare('DELETE FROM file_chunks WHERE file_id = ?').bind(f.id),
          env.DB.prepare('DELETE FROM files WHERE id = ?').bind(f.id),
        ])
        await log(env, user, c.id, `Removed ${f.name}`)
        return json({ ok: true })
      }
    }

    // ---------------- design approvals: client answers
    const appr = path.match(/^approvals\/([\w-]{36})$/)
    if (appr && method === 'POST') {
      const a = await env.DB.prepare('SELECT * FROM approvals WHERE id = ?').bind(appr[1]).first()
      if (!a) throw new Err(404, 'Not found.')
      const c = await clientFor(env, user, a.client_id)
      if (c.id !== a.client_id) throw new Err(404, 'Not found.')
      const b = await body(request)
      const decision = b.decision === 'approved' ? 'approved' : 'changes'
      const response = clean(b.comment, 3000)
      if (decision === 'changes' && response.length < 3) throw new Err(400, 'Tell us what you’d like changing.')
      await env.DB.prepare('UPDATE approvals SET status = ?, response = ?, responded_by = ?, responded_at = ? WHERE id = ?').bind(decision, response || null, user.name || user.email, Date.now(), a.id).run()
      await log(env, user, c.id, `${decision === 'approved' ? 'Approved' : 'Asked for changes to'} “${a.title}”`)
      if (!user.admin) alertUs(ctx, user, c, decision === 'approved' ? `approved “${a.title}”` : `asked for changes to “${a.title}”`, response)
      return json({ ok: true })
    }

    // ---------------- staff only
    if (!user.admin) throw new Err(403, 'Not allowed.')

    // ---------------- team: everyone staff can see it, only owners change it
    if (path === 'admin/team' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT email, name, added_by, created_at, last_seen FROM staff ORDER BY created_at').all()
      return json({ owners: owners(env), staff: results })
    }

    if (path === 'admin/team' && method === 'POST') {
      if (!user.owner) throw new Err(403, 'Only an owner can change the team.')
      const b = await body(request)
      const email = clean(b.email, 200).toLowerCase()
      if (!isEmail(email)) throw new Err(400, 'Enter their email address.')
      if (owners(env).includes(email)) throw new Err(400, 'That address is already an owner.')
      if (await env.DB.prepare('SELECT 1 FROM people WHERE email = ?').bind(email).first()) throw new Err(409, 'That email is set up as a client. Remove it from the client first.')
      await env.DB.prepare('INSERT INTO staff (email, name, added_by, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = excluded.name')
        .bind(email, clean(b.name, 100) || null, user.email, Date.now()).run()
      await log(env, user, null, `Added ${email} to staff`)
      return json({ ok: true })
    }

    if (path === 'admin/team' && method === 'DELETE') {
      if (!user.owner) throw new Err(403, 'Only an owner can change the team.')
      const email = clean(q.get('email'), 200).toLowerCase()
      if (owners(env).includes(email)) throw new Err(400, 'Owners are set in wrangler.toml, not here.')
      await env.DB.prepare('DELETE FROM staff WHERE email = ?').bind(email).run()
      await env.DB.prepare('DELETE FROM sessions WHERE email = ?').bind(email).run()
      await log(env, user, null, `Removed ${email} from staff`)
      return json({ ok: true })
    }

    // Everything waiting on us, oldest first.
    if (path === 'admin/inbox' && method === 'GET') {
      const [reqs, appr, files] = await Promise.all([
        env.DB.prepare(`SELECT r.id, r.client_id, c.business, r.email, r.message, r.kind, r.status, r.created_at,
            (SELECT MAX(created_at) FROM request_messages m WHERE m.request_id = r.id) AS last_msg,
            (SELECT staff FROM request_messages m WHERE m.request_id = r.id ORDER BY created_at DESC LIMIT 1) AS last_staff
          FROM requests r JOIN clients c ON c.id = r.client_id WHERE r.status != 'done' ORDER BY r.created_at`).all(),
        env.DB.prepare(`SELECT a.*, c.business FROM approvals a JOIN clients c ON c.id = a.client_id WHERE a.status = 'changes' OR (a.status = 'approved' AND a.responded_at > ?) ORDER BY a.responded_at`).bind(Date.now() - 7 * DAY).all(),
        env.DB.prepare('SELECT f.id, f.client_id, f.name, f.type, f.size, f.uploaded_by, f.created_at, c.business FROM files f JOIN clients c ON c.id = f.client_id WHERE f.staff = 0 AND f.created_at > ? ORDER BY f.created_at DESC').bind(Date.now() - 14 * DAY).all(),
      ])
      return json({ requests: reqs.results, approvals: appr.results, files: files.results })
    }

    if (path === 'admin/activity' && method === 'GET') {
      const client = q.get('client')
      const { results } = client
        ? await env.DB.prepare('SELECT a.*, c.business FROM activity a LEFT JOIN clients c ON c.id = a.client_id WHERE a.client_id = ? ORDER BY a.created_at DESC LIMIT 200').bind(client).all()
        : await env.DB.prepare('SELECT a.*, c.business FROM activity a LEFT JOIN clients c ON c.id = a.client_id ORDER BY a.created_at DESC LIMIT 200').all()
      return json({ activity: results })
    }

    if (path === 'admin/clients' && method === 'GET') {
      const today = ymdOf(Date.now())
      const soon = ymdOf(Date.now() + 30 * DAY)
      const [clients, overdue, renewals] = await Promise.all([
        env.DB.prepare(`SELECT c.*,
            (SELECT COUNT(*) FROM requests r WHERE r.client_id = c.id AND r.status != 'done') AS open_requests,
            (SELECT COUNT(*) FROM invoices i WHERE i.client_id = c.id AND i.status = 'due') AS due_invoices,
            (SELECT COUNT(*) FROM approvals a WHERE a.client_id = c.id AND a.status = 'pending') AS pending_approvals,
            (SELECT COUNT(*) FROM people p WHERE p.client_id = c.id) AS people
          FROM clients c ORDER BY c.business`).all(),
        env.DB.prepare("SELECT i.*, c.business FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.status = 'due' AND i.due_date IS NOT NULL AND i.due_date < ? ORDER BY i.due_date").bind(today).all(),
        env.DB.prepare('SELECT id, business, plan, plan_renews FROM clients WHERE plan_renews IS NOT NULL AND plan_renews <= ? ORDER BY plan_renews').bind(soon).all(),
      ])
      return json({ clients: clients.results, overdue: overdue.results, renewals: renewals.results })
    }

    if (path === 'admin/clients' && method === 'POST') {
      const b = await body(request)
      const business = clean(b.business, 120)
      if (!business) throw new Err(400, 'Business name is needed.')
      const id = crypto.randomUUID()
      await env.DB.prepare('INSERT INTO clients (id, business, site_url, preview_url, status, plan, stage, site_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, business, url(b.site_url), url(b.preview_url), clean(b.status, 300) || null, clean(b.plan, 200) || null, 'brief', token(8), Date.now()).run()
      await log(env, user, id, `Added client ${business}`)
      return json({ ok: true, id })
    }

    const clientEdit = path.match(/^admin\/clients\/([\w-]+)$/)
    if (clientEdit && method === 'PATCH') {
      const b = await body(request)
      const c = await clientFor(env, user, clientEdit[1])
      // Only the fields sent are changed, so the Project tab can send just the stage.
      const has = (k) => k in b
      const stage = STAGES.includes(b.stage) ? b.stage : c.stage
      const renews = has('plan_renews') ? (/^\d{4}-\d{2}-\d{2}$/.test(String(b.plan_renews || '')) ? b.plan_renews : null) : c.plan_renews
      await env.DB.prepare('UPDATE clients SET business = ?, site_url = ?, preview_url = ?, status = ?, plan = ?, stage = ?, plan_renews = ?, check_at = NULL WHERE id = ?')
        .bind(
          has('business') ? clean(b.business, 120) || c.business : c.business,
          has('site_url') ? url(b.site_url) : c.site_url,
          has('preview_url') ? url(b.preview_url) : c.preview_url,
          has('status') ? clean(b.status, 300) || null : c.status,
          has('plan') ? clean(b.plan, 200) || null : c.plan,
          stage, renews, c.id,
        ).run()
      await log(env, user, c.id, stage !== c.stage ? `Moved the project to ${stage}` : 'Edited the client details')
      if (stage !== c.stage) notifyClient(ctx, c, 'stage', `Your project has moved to: ${stage[0].toUpperCase()}${stage.slice(1)}`, has('status') ? clean(b.status, 300) : c.status || '')
      return json({ ok: true })
    }

    if (path === 'admin/people' && method === 'POST') {
      const b = await body(request)
      const c = await clientFor(env, user, b.client)
      const email = clean(b.email, 200).toLowerCase()
      if (!isEmail(email)) throw new Err(400, 'Enter their email address.')
      if (await isStaff(env, email)) throw new Err(400, 'That is a staff address.')
      const taken = await env.DB.prepare('SELECT client_id FROM people WHERE email = ?').bind(email).first()
      if (taken && taken.client_id !== c.id) throw new Err(409, 'That email is already set up for another client.')
      await env.DB.prepare('INSERT INTO people (email, client_id, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = excluded.name')
        .bind(email, c.id, clean(b.name, 100) || null, Date.now()).run()
      await log(env, user, c.id, `Gave ${email} access`)
      let invited = false
      if (b.invite) invited = await mail(env, request, 'invite', email, { name: clean(b.name, 100), business: c.business })
      return json({ ok: true, invited })
    }

    if (path === 'admin/people' && method === 'DELETE') {
      const email = clean(q.get('email'), 200).toLowerCase()
      const p = await env.DB.prepare('SELECT client_id FROM people WHERE email = ?').bind(email).first()
      await env.DB.prepare('DELETE FROM people WHERE email = ?').bind(email).run()
      await env.DB.prepare('DELETE FROM sessions WHERE email = ?').bind(email).run()
      await log(env, user, p?.client_id, `Removed ${email}'s access`)
      return json({ ok: true })
    }

    if (path === 'admin/updates' && method === 'POST') {
      const b = await body(request)
      const c = await clientFor(env, user, b.client)
      const text = clean(b.body, 3000)
      if (!text) throw new Err(400, 'Write the update.')
      await env.DB.prepare('INSERT INTO updates (id, client_id, body, author, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), c.id, text, user.name, Date.now()).run()
      await log(env, user, c.id, 'Posted an update')
      notifyClient(ctx, c, 'update', 'New update on your project', text)
      return json({ ok: true })
    }

    const reqEdit = path.match(/^admin\/requests\/([\w-]+)$/)
    if (reqEdit && method === 'PATCH') {
      const b = await body(request)
      const status = ['open', 'in_progress', 'done'].includes(b.status) ? b.status : 'open'
      await env.DB.prepare('UPDATE requests SET status = ?, updated_at = ? WHERE id = ?').bind(status, Date.now(), reqEdit[1]).run()
      return json({ ok: true })
    }

    if (path === 'admin/invoices' && method === 'POST') {
      const b = await body(request)
      const c = await clientFor(env, user, b.client)
      const pence = Math.round(Number(String(b.amount).replace(/[£,\s]/g, '')) * 100)
      if (!Number.isFinite(pence) || pence <= 0) throw new Err(400, 'Enter the amount to pay, including VAT.')
      const description = clean(b.description, 300)
      if (!description) throw new Err(400, 'Say what the invoice is for.')
      const due = /^\d{4}-\d{2}-\d{2}$/.test(String(b.due_date || '')) ? b.due_date : null
      await env.DB.prepare('INSERT INTO invoices (id, client_id, number, description, amount_pence, due_date, pay_url, file_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), c.id, clean(b.number, 40) || null, description, pence, due, url(b.pay_url), url(b.file_url), Date.now()).run()
      await log(env, user, c.id, `Added invoice: ${description}`)
      notifyClient(ctx, c, 'invoice', `New invoice: ${description}`, `£${(pence / 100).toFixed(2)}${due ? `, due ${due}` : ''}`)
      return json({ ok: true })
    }

    const invEdit = path.match(/^admin\/invoices\/([\w-]+)$/)
    if (invEdit && method === 'PATCH') {
      const b = await body(request)
      const status = ['due', 'paid', 'void'].includes(b.status) ? b.status : 'due'
      const inv = await env.DB.prepare('SELECT client_id, description FROM invoices WHERE id = ?').bind(invEdit[1]).first()
      await env.DB.prepare('UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?').bind(status, status === 'paid' ? Date.now() : null, invEdit[1]).run()
      if (inv) await log(env, user, inv.client_id, `${status === 'paid' ? 'Marked paid' : status === 'void' ? 'Removed' : 'Reopened'}: ${inv.description}`)
      return json({ ok: true })
    }

    if (path === 'admin/documents' && method === 'POST') {
      const b = await body(request)
      const c = await clientFor(env, user, b.client)
      const title = clean(b.title, 200)
      const link = url(b.url)
      if (!title || !link) throw new Err(400, 'A document needs a name and a link.')
      await env.DB.prepare('INSERT INTO documents (id, client_id, title, url, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), c.id, title, link, Date.now()).run()
      await log(env, user, c.id, `Added document: ${title}`)
      return json({ ok: true })
    }

    const docDel = path.match(/^admin\/documents\/([\w-]+)$/)
    if (docDel && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(docDel[1]).run()
      return json({ ok: true })
    }

    if (path === 'admin/approvals' && method === 'POST') {
      const b = await body(request)
      const c = await clientFor(env, user, b.client)
      const title = clean(b.title, 200)
      if (!title) throw new Err(400, 'Give it a name, like “Home page design”.')
      await env.DB.prepare('INSERT INTO approvals (id, client_id, title, url, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), c.id, title, url(b.url), clean(b.note, 2000) || null, user.name, Date.now()).run()
      await log(env, user, c.id, `Asked for approval: ${title}`)
      notifyClient(ctx, c, 'approval', `Please take a look: ${title}`, clean(b.note, 600))
      return json({ ok: true })
    }

    const apprDel = path.match(/^admin\/approvals\/([\w-]{36})$/)
    if (apprDel && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM approvals WHERE id = ?').bind(apprDel[1]).run()
      return json({ ok: true })
    }

    if (path === 'admin/notes' && method === 'POST') {
      const b = await body(request)
      const c = await clientFor(env, user, b.client)
      const text = clean(b.body, 4000)
      if (!text) throw new Err(400, 'Write the note.')
      await env.DB.prepare('INSERT INTO notes (id, client_id, body, author, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), c.id, text, user.name, Date.now()).run()
      return json({ ok: true })
    }

    const noteDel = path.match(/^admin\/notes\/([\w-]{36})$/)
    if (noteDel && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(noteDel[1]).run()
      return json({ ok: true })
    }

    throw new Err(404, 'Not found.')
  } catch (e) {
    if (e instanceof Err) return json({ error: e.message }, e.status)
    console.error(e)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
