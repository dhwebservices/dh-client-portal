-- Client area v3: dashboard, stats, threads, files, approvals, notes, activity.
-- Additive only, so the version already live keeps working against it.

ALTER TABLE clients ADD COLUMN stage TEXT;            -- brief | design | build | review | launch | live
ALTER TABLE clients ADD COLUMN plan_renews TEXT;      -- YYYY-MM-DD
ALTER TABLE clients ADD COLUMN site_key TEXT;         -- public key for the stats beacon
ALTER TABLE clients ADD COLUMN check_at INTEGER;      -- last uptime check
ALTER TABLE clients ADD COLUMN check_ok INTEGER;
ALTER TABLE clients ADD COLUMN check_ms INTEGER;
UPDATE clients SET site_key = lower(hex(randomblob(8))) WHERE site_key IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_site_key ON clients(site_key);

ALTER TABLE people ADD COLUMN notify INTEGER NOT NULL DEFAULT 1;
ALTER TABLE requests ADD COLUMN kind TEXT;            -- hours | offer | menu | photos | other

CREATE TABLE IF NOT EXISTS request_messages (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  staff INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_msgs_request ON request_messages(request_id, created_at);

-- Files are stored in D1 in 1 MB chunks (R2 isn't enabled on the account).
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  chunks INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  staff INTEGER NOT NULL DEFAULT 0,
  request_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_client ON files(client_id, created_at);
CREATE TABLE IF NOT EXISTS file_chunks (
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (file_id, idx)
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | changes
  response TEXT,
  responded_by TEXT,
  responded_at INTEGER,
  created_by TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_approvals_client ON approvals(client_id, created_at);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT,
  actor TEXT NOT NULL,
  staff INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_time ON activity(created_at);

-- Website stats from the beacon (t.js). No cookies, no personal data.
CREATE TABLE IF NOT EXISTS pv_daily (
  client_id TEXT NOT NULL,
  day TEXT NOT NULL,                 -- YYYY-MM-DD (UTC)
  views INTEGER NOT NULL DEFAULT 0,
  enquiries INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (client_id, day)
);
CREATE TABLE IF NOT EXISTS pv_pages (
  client_id TEXT NOT NULL,
  month TEXT NOT NULL,               -- YYYY-MM
  path TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (client_id, month, path)
);
CREATE TABLE IF NOT EXISTS pv_refs (
  client_id TEXT NOT NULL,
  month TEXT NOT NULL,
  source TEXT NOT NULL,              -- referring site, or "Direct"
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (client_id, month, source)
);
