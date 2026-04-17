-- ═══════════════════════════════════════════════════════════════════
-- EMBA Pořadače APS — SPRÁVA UŽIVATELŮ A ROLÍ
-- ═══════════════════════════════════════════════════════════════════
-- Použij podle potřeby — jednotlivé bloky kopíruj do SQL editoru.
-- ═══════════════════════════════════════════════════════════════════


-- ─── Zobrazit všechny uživatele a jejich role ─────────────────────
select 
  au.email,
  ur.role,
  ur.label,
  au.created_at::date as vytvoreno,
  au.last_sign_in_at::date as posledni_prihlaseni
from auth.users au
left join user_roles ur on ur.user_id = au.id
order by au.created_at;


-- ─── Povýšit uživatele na admina (podle emailu) ───────────────────
update user_roles
set role = 'admin', label = 'Administrátor'
where user_id = (select id from auth.users where email = 'admin@emba.cz');


-- ─── Nastavit plánovače ───────────────────────────────────────────
update user_roles
set role = 'planner', label = 'Plánovač výroby'
where user_id = (select id from auth.users where email = 'plan@emba.cz');


-- ─── Nastavit viewera ─────────────────────────────────────────────
update user_roles
set role = 'viewer', label = 'Výroba'
where user_id = (select id from auth.users where email = 'view@emba.cz');


-- ─── Změnit label (jméno zobrazené v UI) ──────────────────────────
update user_roles
set label = 'Ondřej Novák'
where user_id = (select id from auth.users where email = 'ondrej@emba.cz');


-- ─── Smazat roli uživatele (uživatel zůstane v auth, ale bez role = viewer default) ───
delete from user_roles
where user_id = (select id from auth.users where email = 'nekdo@emba.cz');


-- ─── Kompletní smazání uživatele (z auth i user_roles) ────────────
-- POZOR: nevratné!
-- delete from auth.users where email = 'nekdo@emba.cz';
-- (user_roles se smaže automaticky díky ON DELETE CASCADE)


-- ─── Nastavit role pro všechny tři testovací uživatele najednou ───
update user_roles ur
set role = new_role, label = new_label
from (
  values 
    ('admin@emba.cz', 'admin', 'Administrátor'),
    ('plan@emba.cz', 'planner', 'Plánovač výroby'),
    ('view@emba.cz', 'viewer', 'Výroba')
) as t(email, new_role, new_label)
where ur.user_id = (select id from auth.users where email = t.email);
