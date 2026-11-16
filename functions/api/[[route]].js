// DH client area API.
//
// Sign-in is an emailed 6-digit code: no passwords, no Microsoft account.
// Clients see only their own business. Addresses in ADMINS see every client
// and can edit. All data is in this project's private D1 database.

const DAY = 86400000
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

async function body(req) { try { return await req.json() } catch { return {} } }
const admins = (env) => String(env.ADMINS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)

async function whoAmI(req, env) {
  const t = cookie(req, COOKIE)
  if (!t) return null
  const s = await env.DB.prepare('SELECT email FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(await sha(t), Date.now()).first()
  if (!s) return null
  if (admins(env).includes(s.email)) return { email: s.email, admin: true, name: s.email.split('@')[0].replace(/^./, (c) => c.toUpperCase()) }
  const p = await env.DB.prepare('SELECT * FROM people WHERE email = ?').bind(s.email).first()
  if (!p) return null
  await env.DB.prepare('UPDATE people SET last_seen = ? WHERE email = ?').bind(Date.now(), p.email).run()
  return { email: p.email, admin: false, name: p.name, client_id: p.client_id }
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

export async function onRequest({ request, env, params }) {
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

    // Writes need this header, which a cross-site form can't send.
    if (method !== 'GET' && request.headers.get('x-dhc') !== '1') throw new Err(400, 'Bad request.')

    // ---------------- sign-in
    if (path === 'auth/start' && method === 'POST') {
      const email = clean((await body(request)).email, 200).toLowerCase()
      if (!isEmail(email)) throw new Err(400, 'Enter your email address.')
      const known = admins(env).includes(email) || await env.DB.prepare('SELECT 1 FROM people WHERE email = ?').bind(email).first()
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

    // Everything a client sees, in one call.
    if (path === 'overview' && method === 'GET') {
      const c = await clientFor(env, user, q.get('client'))
      const [updates, requests, invoices, documents, people] = await Promise.all([
        env.DB.prepare('SELECT * FROM updates WHERE client_id = ? ORDER BY created_at DESC LIMIT 50').bind(c.id).all(),
        env.DB.prepare('SELECT * FROM requests WHERE client_id = ? ORDER BY created_at DESC LIMIT 100').bind(c.id).all(),
        env.DB.prepare("SELECT * FROM invoices WHERE client_id = ? AND status != 'void' ORDER BY created_at DESC").bind(c.id).all(),
        env.DB.prepare('SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC').bind(c.id).all(),
        user.admin ? env.DB.prepare('SELECT email, name, last_seen FROM people WHERE client_id = ? ORDER BY created_at').bind(c.id).all() : Promise.resolve({ results: [] }),
      ])
      return json({ client: c, updates: updates.results, requests: requests.results, invoices: invoices.results, documents: documents.results, people: people.results })
    }

    if (path === 'requests' && method === 'POST') {
      const b = await body(request)
      const c = await clientFor(env, user, b.client)
      const message = clean(b.message, 4000)
      if (message.length < 3) throw new Err(400, 'Tell us what you need changing.')
      const id = crypto.randomUUID()
      await env.DB.prepare('INSERT INTO requests (id, client_id, email, message, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, c.id, user.email, message, Date.now()).run()
      if (!user.admin) await mail(env, request, 'request', null, { name: user.name, email: user.email, business: c.business, message }).catch(() => {})
      return json({ ok: true, id })
    }

    // ---------------- staff only
    if (!user.admin) throw new Err(403, 'Not allowed.')

    if (path === 'admin/clients' && method === 'GET') {
      const { results } = await env.DB.prepare(`SELECT c.*,
          (SELECT COUNT(*) FROM requests r WHERE r.client_id = c.id AND r.status != 'done') AS open_requests,
          (SELECT COUNT(*) FROM invoices i WHERE i.client_id = c.id AND i.status = 'due') AS due_invoices,
          (SELECT COUNT(*) FROM people p WHERE p.client_id = c.id) AS people
        FROM clients c ORDER BY c.business`).all()
      return json({ clients: results })
    }

    if (path === 'admin/clients' && method === 'POST') {
      const b = await body(request)
      const business = clean(b.business, 120)
      if (!business) throw new Err(400, 'Business name is needed.')
      const id = crypto.randomUUID()
      await env.DB.prepare('INSERT INTO clients (id, business, site_url, preview_url, status, plan, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, business, url(b.site_url), url(b.preview_url), clean(b.status, 300) || null, clean(b.plan, 200) || null, Date.now()).run()
      return json({ ok: true, id })
    }

    const clientEdit = path.match(/^admin\/clients\/([\w-]+)$/)
    if (clientEdit && method === 'PATCH') {
      const b = await body(request)
      const c = await clientFor(env, user, clientEdit[1])
      await env.DB.prepare('UPDATE clients SET business = ?, site_url = ?, preview_url = ?, status = ?, plan = ? WHERE id = ?')
        .bind(clean(b.business, 120) || c.business, url(b.site_url), url(b.preview_url), clean(b.status, 300) || null, clean(b.plan, 200) || null, c.id).run()
      return json({ ok: true })
    }

    if (path === 'admin/people' && method === 'POST') {
      const b = await body(request)
      const c = await clientFor(env, user, b.client)
      const email = clean(b.email, 200).toLowerCase()
      if (!isEmail(email)) throw new Err(400, 'Enter their email address.')
      if (admins(env).includes(email)) throw new Err(400, 'That is a staff address.')
      const taken = await env.DB.prepare('SELECT client_id FROM people WHERE email = ?').bind(email).first()
      if (taken && taken.client_id !== c.id) throw new Err(409, 'That email is already set up for another client.')
      await env.DB.prepare('INSERT INTO people (email, client_id, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = excluded.name')
        .bind(email, c.id, clean(b.name, 100) || null, Date.now()).run()
      let invited = false
      if (b.invite) invited = await mail(env, request, 'invite', email, { name: clean(b.name, 100), business: c.business })
      return json({ ok: true, invited })
    }

    if (path === 'admin/people' && method === 'DELETE') {
      const email = clean(q.get('email'), 200).toLowerCase()
      await env.DB.prepare('DELETE FROM people WHERE email = ?').bind(email).run()
      await env.DB.prepare('DELETE FROM sessions WHERE email = ?').bind(email).run()
      return json({ ok: true })
    }

    if (path === 'admin/updates' && method === 'POST') {
      const b = await body(request)
      const c = await clientFor(env, user, b.client)
      const text = clean(b.body, 3000)
      if (!text) throw new Err(400, 'Write the update.')
      await env.DB.prepare('INSERT INTO updates (id, client_id, body, author, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), c.id, text, user.name, Date.now()).run()
      return json({ ok: true })
    }

    const reqEdit = path.match(/^admin\/requests\/([\w-]+)$/)
    if (reqEdit && method === 'PATCH') {
      const b = await body(request)
      const status = ['open', 'in_progress', 'done'].includes(b.status) ? b.status : 'open'
      await env.DB.prepare('UPDATE requests SET status = ?, reply = ?, replied_by = ?, updated_at = ? WHERE id = ?')
        .bind(status, clean(b.reply, 3000) || null, user.name, Date.now(), reqEdit[1]).run()
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
      return json({ ok: true })
    }

    const invEdit = path.match(/^admin\/invoices\/([\w-]+)$/)
    if (invEdit && method === 'PATCH') {
      const b = await body(request)
      const status = ['due', 'paid', 'void'].includes(b.status) ? b.status : 'due'
      await env.DB.prepare('UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?').bind(status, status === 'paid' ? Date.now() : null, invEdit[1]).run()
      return json({ ok: true })
    }

    if (path === 'admin/documents' && method === 'POST') {
      const b = await body(request)
      const c = await clientFor(env, user, b.client)
      const title = clean(b.title, 200)
      const link = url(b.url)
      if (!title || !link) throw new Err(400, 'A document needs a name and a link.')
      await env.DB.prepare('INSERT INTO documents (id, client_id, title, url, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), c.id, title, link, Date.now()).run()
      return json({ ok: true })
    }

    const docDel = path.match(/^admin\/documents\/([\w-]+)$/)
    if (docDel && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(docDel[1]).run()
      return json({ ok: true })
    }

    throw new Err(404, 'Not found.')
  } catch (e) {
    if (e instanceof Err) return json({ error: e.message }, e.status)
    console.error(e)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
