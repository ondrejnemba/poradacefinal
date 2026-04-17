# EMBA Pořadače — APS Plánovač výroby

Enterprise production planning & scheduling for binder manufacturing.

**Features:**
- EDF scheduling with deadline-first priority
- Pipeline overlapping (transfer batch)
- Drag & drop in list and Gantt with auto-rescheduling
- Multi-select (Shift/Ctrl+click) + batch reordering
- Order locking (chain-lock: locking one locks all preceding)
- Novinky (new orders) kept separate, not planned
- Shift management with instant collision detection
- 2-step delete confirmation
- Supabase Auth + role-based access (admin, planner, viewer)
- Real-time persistence via Supabase kv_store
- localStorage offline fallback

## Quick Start (local)

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. Works offline with localStorage if no `.env` is configured.

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `sql/schema.sql` in SQL Editor
3. Enable Email Auth: **Authentication → Providers → Email**
4. Create users in **Authentication → Users**
5. Assign roles via SQL Editor:
   ```sql
   insert into user_roles (user_id, role, label)
   values ('USER_UUID_FROM_AUTH', 'admin', 'Ondřej');
   -- Roles: 'admin', 'planner', 'viewer'
   ```
6. Copy `.env.example` → `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

## Deploy to Vercel

### Option A: Vercel CLI
```bash
npm i -g vercel
vercel
# In Vercel dashboard → Project Settings → Environment Variables:
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

### Option B: GitHub integration
1. Push to GitHub
2. Import repo in Vercel
3. Set env vars in project settings
4. Auto-deploys on every push

## Architecture

### Production flow
```
BDM (MRAMOR or PP) → AP-1 → [CENTRA]* → HANG
                                  ↑ only for PP/PP, PP/PAP
```

### Scheduling
- **EDF (Earliest Deadline First)** with firmness (Potvrzeno 3×, Návrh 1.5×)
- **Pipeline overlap**: downstream starts after 10% of upstream duration (max 1h)
- **Changeover (MAX principle)**: BDM typ=90min, šířka=60min (75↔80=0); AP1/CENTRA/HANG typ=30min, šířka=20min
- **Sunday** = always off (unless overridden in calendar)
- **Novinky** = not scheduled, separate section at top
- **Locked orders** = fixed position, optimizer works around them

### Roles

| Role | Permissions |
|------|------------|
| `admin` | Full access + user management |
| `planner` | Full planning access, can create orders |
| `viewer` | Read-only |

## Offline Mode

Without `.env` / Supabase credentials, app works fully offline via localStorage.

Offline login (any password ≥1 char):
- `admin@emba.cz` → admin role
- `plan@emba.cz` → planner role
- `view@emba.cz` → viewer role

## Data Model

Stored in Supabase `kv_store` table (shared across all users):
- Key `emba_poradace_appdata` = `{orders, dts, settings}` JSON

Session data also cached in localStorage for instant load + offline fallback.
500ms debounce on save to reduce Supabase calls.

## Key files

```
src/
├── App.jsx              (main app — all components)
├── supabase.js          (client singleton)
├── db.js                (load/save with debounce + fallback)
├── main.jsx             (entry)
└── index.css            (globals)

sql/
└── schema.sql           (kv_store + user_roles + RLS + trigger)

vercel.json              (SPA routing)
.env.example             (credentials template)
```
