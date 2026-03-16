-- Client accounts (linked to onboarded clients)
create table client_accounts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  contact text,
  email text unique not null,
  phone text,
  plan text,
  value numeric default 0,
  status text default 'active',
  invoice_paid boolean default false,
  joined date default current_date,
  deployment_status text default 'accepted',
  website_url text,
  notes text,
  created_at timestamp with time zone default now()
);

-- Client invoices
create table client_invoices (
  id uuid default gen_random_uuid() primary key,
  client_email text not null,
  client_name text,
  invoice_number text,
  description text,
  amount numeric not null,
  status text default 'unpaid',
  stripe_link text,
  due_date date,
  created_at timestamp with time zone default now()
);

-- Client documents
create table client_documents (
  id uuid default gen_random_uuid() primary key,
  client_email text not null,
  name text not null,
  type text default 'Other',
  file_url text,
  uploaded_by text,
  created_at timestamp with time zone default now()
);

-- Deployment updates (staff posts these)
create table deployment_updates (
  id uuid default gen_random_uuid() primary key,
  client_email text not null,
  title text not null,
  message text,
  staff_name text,
  created_at timestamp with time zone default now()
);

-- Support tickets
create table support_tickets (
  id uuid default gen_random_uuid() primary key,
  client_email text not null,
  client_name text,
  subject text not null,
  message text not null,
  priority text default 'Normal',
  status text default 'open',
  staff_reply text,
  replied_by text,
  replied_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Activity log
create table client_activity (
  id uuid default gen_random_uuid() primary key,
  client_email text not null,
  type text not null,
  title text not null,
  description text,
  created_at timestamp with time zone default now()
);

-- RLS policies (allow all for now)
alter table client_accounts    enable row level security;
alter table client_invoices    enable row level security;
alter table client_documents   enable row level security;
alter table deployment_updates enable row level security;
alter table support_tickets    enable row level security;
alter table client_activity    enable row level security;

create policy "Allow all" on client_accounts    for all using (true) with check (true);
create policy "Allow all" on client_invoices    for all using (true) with check (true);
create policy "Allow all" on client_documents   for all using (true) with check (true);
create policy "Allow all" on deployment_updates for all using (true) with check (true);
create policy "Allow all" on support_tickets    for all using (true) with check (true);
create policy "Allow all" on client_activity    for all using (true) with check (true);
