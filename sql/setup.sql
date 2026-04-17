-- ═══════════════════════════════════════════════════════════════════
-- EMBA Pořadače APS — KOMPLETNÍ SETUP
-- ═══════════════════════════════════════════════════════════════════
-- Spusť celý tento soubor v Supabase SQL Editor.
-- Je idempotentní — můžeš ho spustit opakovaně, nic nerozbije.
-- 
-- PŘED SPUŠTĚNÍM:
-- 1. V Authentication → Users vytvoř uživatele (aspoň jednoho admina)
--    - Při vytváření zaškrtni "Auto Confirm User"
-- 2. V Authentication → Providers → Email zapni "Enable Email provider"
-- ═══════════════════════════════════════════════════════════════════


-- ─── 1. KV_STORE (aplikační data: zakázky, směny, odstávky) ───────
create table if not exists kv_store (
  key text primary key,
  value text not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table kv_store enable row level security;


-- ─── 2. USER_ROLES (role uživatelů) ───────────────────────────────
create table if not exists user_roles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  role text not null default 'viewer' check (role in ('admin', 'planner', 'viewer')),
  label text,
  created_at timestamptz default now()
);

alter table user_roles enable row level security;


-- ─── 3. POLITIKY — drop pokud existují, pak znovu vytvoř ─────────
-- kv_store: všichni přihlášení mohou číst i zapisovat (pro týmovou spolupráci)
drop policy if exists "kv_read" on kv_store;
drop policy if exists "kv_write" on kv_store;
drop policy if exists "kv_update" on kv_store;
drop policy if exists "kv_delete" on kv_store;

create policy "kv_read" on kv_store for select to authenticated using (true);
create policy "kv_write" on kv_store for insert to authenticated with check (true);
create policy "kv_update" on kv_store for update to authenticated using (true);
create policy "kv_delete" on kv_store for delete to authenticated using (true);

-- user_roles: všichni přihlášení čtou, jen admin zapisuje
drop policy if exists "roles_read" on user_roles;
drop policy if exists "roles_admin_write" on user_roles;

create policy "roles_read" on user_roles for select to authenticated using (true);
create policy "roles_admin_write" on user_roles for all to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'));


-- ─── 4. TRIGGER pro auto-update timestampu ────────────────────────
create or replace function update_kv_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists kv_store_timestamp on kv_store;
create trigger kv_store_timestamp
  before update on kv_store
  for each row execute function update_kv_timestamp();


-- ─── 5. AUTO-ROLE pro nové uživatele (default: viewer) ────────────
-- Když se někdo zaregistruje, automaticky dostane roli 'viewer'
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_roles (user_id, role, label)
  values (new.id, 'viewer', split_part(new.email, '@', 1))
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ─── 6. ZPĚTNÉ DOPLNĚNÍ rolí pro existující uživatele ─────────────
-- Každý uživatel v auth.users, který zatím nemá záznam v user_roles, dostane 'viewer'
insert into user_roles (user_id, role, label)
select u.id, 'viewer', split_part(u.email, '@', 1)
from auth.users u
where not exists (select 1 from user_roles ur where ur.user_id = u.id)
on conflict (user_id) do nothing;


-- ─── 7. POVÝŠENÍ PRVNÍHO UŽIVATELE NA ADMINA ──────────────────────
-- Pokud ještě neexistuje žádný admin, udělá se jím nejstarší uživatel
-- (většinou ten, který projekt vytvořil)
do $$
declare
  first_user_id uuid;
begin
  if not exists (select 1 from user_roles where role = 'admin') then
    select id into first_user_id from auth.users order by created_at asc limit 1;
    if first_user_id is not null then
      update user_roles
      set role = 'admin', label = 'Administrátor'
      where user_id = first_user_id;
      raise notice 'První uživatel povýšen na admina: %', first_user_id;
    end if;
  end if;
end $$;


-- ═══════════════════════════════════════════════════════════════════
-- HOTOVO! 
-- ═══════════════════════════════════════════════════════════════════
-- Zkontroluj výsledek:
select 
  au.email,
  ur.role,
  ur.label,
  au.created_at::date as vytvoreno
from auth.users au
left join user_roles ur on ur.user_id = au.id
order by au.created_at;
