# inclu_manager

**Incluhub's command center for getting things done.**

A Kanban CRM with project-based access: client companies → teams → boards, invite-only auth, and role-based permissions.

## Stack

- **Next.js 16** (App Router)
- **Supabase** (Auth + Postgres + RLS)
- **Tailwind CSS**
- **Vercel** (deployment)
- **GitHub Actions** (CI/CD)

## Hierarchy

```
Super Admin
  └── Project (client company, e.g. Elvix, Kosara)
        ├── Manager(s) — assigned per project
        ├── Client — view entire project + comment
        └── Team(s) — e.g. HR, Web Dev
              ├── Board(s)
              └── Editor / Viewer — assigned per team
```

## Quick Start

### 1. Clone and install

```bash
cd inclu_manager
npm install
cp .env.example .env.local
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy **Project URL**, **anon key**, and **service role key** into `.env.local`
3. Apply migrations (in order):

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste each file in `supabase/migrations/` into the Supabase SQL Editor in numeric order.

### 3. Create your super admin

1. Start the app: `npm run dev`
2. Sign up at `/login` with your email
3. In Supabase SQL Editor:

```sql
update public.profiles
set role = 'super_admin', team_id = null
where email = 'your@email.com';
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Roles

| Role | Access |
|------|--------|
| `super_admin` | Full CRM control; create projects, assign managers/clients |
| `manager` | Manage assigned project(s): teams, boards, members, all tasks |
| `editor` | Assigned team boards; edit/drag only tasks assigned to them |
| `viewer` | Read-only on assigned team boards; no comments |
| `client` | View entire project (all teams/boards); comment only |

## Invite Flow

1. Super admin or manager goes to **Admin → Users** (super admin) or **Projects → [project]** (manager)
2. Create invite with email, role, and project/team as needed
3. Share the invite link
4. User signs up via the link — role is assigned automatically

## Deploy to Vercel

Production: `incluhub-manager` on Vercel (linked to GitHub `incluhub_manager`).

1. Push to GitHub `main`
2. Ensure env vars are set in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Vercel auto-deploys on merge to `main`

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **CI** (`ci.yml`) | Every PR + push to `main` | lint, typecheck, build |
| **Migrations** (`migrate.yml`) | Push to `main` when `supabase/migrations/**` changes | `supabase db push` to production |
| **Vercel** | Push to `main` (GitHub integration) | Auto-deploy frontend |

### GitHub Secrets (required for migrations)

Add these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Where to get it |
|--------|-----------------|
| `SUPABASE_ACCESS_TOKEN` | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_REF` | Project Settings → General → Reference ID (`kvrjnjcmsdkcoznlwpaf`) |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database → Database password |

### Vercel environment variables

Set in **Vercel → incluhub-manager → Settings → Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### GitHub Environments (optional)

The migrate workflow uses a `production` environment. Create it under **Settings → Environments** if you want approval gates before DB changes.

## Project Structure

```
src/
  app/           # Pages and server actions
  components/    # UI, Kanban, layout
  lib/           # Auth, permissions, Supabase, data
supabase/
  migrations/    # Database schema + RLS
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

---

Built for **Incluhub**.
