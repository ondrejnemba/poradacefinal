-- ═══ EMBA Pořadače APS — Supabase Schema ═══
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Key-Value Store for app data (orders, settings, downtimes)
create table if not exists kv_store (
  key text primary key,
  value text not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

alter table kv_store enable row level security;

-- All authenticated users can read
create policy "kv_read" on kv_store for select to authenticated using (true);
-- All authenticated users can write (team collaboration)
create policy "kv_write" on kv_store for insert to authenticated with check (true);
create policy "kv_update" on kv_store for update to authenticated using (true);
create policy "kv_delete" on kv_store for delete to authenticated using (true);

-- 2. User Roles
create table if not exists user_roles (
  user_id uuid references auth.users(id) primary key,
  role text not null default 'viewer' check (role in ('admin', 'planner', 'viewer')),
  label text,
  created_at timestamptz default now()
);

alter table user_roles enable row level security;

create policy "roles_read" on user_roles for select to authenticated using (true);
create policy "roles_admin_write" on user_roles for all to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'));

-- 3. Auto-update timestamp on kv_store
create or replace function update_kv_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$ language plpgsql security definer;

create trigger kv_store_timestamp
  before update on kv_store
  for each row execute function update_kv_timestamp();

-- 4. Create initial admin user role (run after first user signs up)
-- Replace 'YOUR_USER_UUID' with the actual UUID from auth.users
-- insert into user_roles (user_id, role, label) values ('YOUR_USER_UUID', 'admin', 'Administrátor');
