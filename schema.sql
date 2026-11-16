-- DH client area (app.dhwebsiteservices.co.uk). Private D1 database: only this
-- project's Functions can read it. Nothing here is in the shared Supabase
-- project, whose tables are readable with the public anon key.

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  business TEXT NOT NULL,
  site_url TEXT,
  preview_url TEXT,
  status TEXT,              -- one line on what's happening now, written by us
  plan TEXT,                -- e.g. "Care plan, £35 a month + VAT"
  created_at INTEGER NOT NULL
);
-- More client columns, request threads, files, approvals, notes, activity and
-- stats are in migrations/0002_features.sql. For a fresh database run this
-- file, then the migrations in order.

-- Staff added on the Team page. Owners come from OWNERS in wrangler.toml.
CREATE TABLE IF NOT EXISTS staff (
  email TEXT PRIMARY KEY,   -- lower case
  name TEXT,
  added_by TEXT,
  created_at INTEGER NOT NULL,
  last_seen INTEGER
);

CREATE TABLE IF NOT EXISTS people (
  email TEXT PRIMARY KEY,   -- lower case
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_seen INTEGER
);

CREATE TABLE IF NOT EXISTS codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT,
  expires_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  last_sent INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS updates (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- open | in_progress | done
  reply TEXT,
  replied_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  number TEXT,
  description TEXT NOT NULL,
  amount_pence INTEGER NOT NULL,        -- total to pay, VAT included
  due_date TEXT,                        -- YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'due',   -- due | paid | void
  pay_url TEXT,                         -- e.g. a Stripe payment link
  file_url TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- One-time email jobs handed to the main site's relay. See MAIL_RELAY.
CREATE TABLE IF NOT EXISTS mail_jobs (
  id TEXT PRIMARY KEY,
  template TEXT NOT NULL,
  recipient TEXT,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_people_client ON people(client_id);
CREATE INDEX IF NOT EXISTS idx_updates_client ON updates(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_requests_client ON requests(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id, created_at);
