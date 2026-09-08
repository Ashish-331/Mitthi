-- Run this entire file once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

create table if not exists chapters (
  id text primary key,
  subject text not null,
  name text not null,
  modules_text text default '',
  modules_count int default 0,
  race text default 'Not Started',
  race_count int default 0,
  neet_pyq_count int default 0,
  jee_pyq_count int default 0,
  confidence int default 3,
  last_revised timestamptz,
  notes text default '',
  updated_at timestamptz default now()
);

-- Row Level Security is on by default for new tables via the dashboard,
-- but we enable it explicitly and add an open policy.
-- NOTE: this app uses a hardcoded frontend login, not real Supabase Auth,
-- so there is no authenticated session to scope rows to. The policy below
-- allows anyone holding your anon key (i.e. anyone with your deployed URL's
-- JS bundle) to read/write this table directly, bypassing the login screen.
-- That's an acceptable tradeoff for a private personal tracker, but do not
-- put sensitive data in this table. See README for how to lock this down
-- further with real Supabase Auth if you ever want to.

alter table chapters enable row level security;

create policy "Allow all access to chapters"
  on chapters
  for all
  using (true)
  with check (true);

-- auto-update updated_at on every row change
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_chapters_updated_at on chapters;
create trigger trg_chapters_updated_at
  before update on chapters
  for each row execute function set_updated_at();
