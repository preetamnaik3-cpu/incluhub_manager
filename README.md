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
| **E2E** (`e2e.yml`) | Push to `main` + manual | Playwright role tests against **production** |
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

## Automated E2E tests (Playwright)

Tests run against **production** to verify the full role matrix: super_admin, manager, editor, viewer, client.

### Local run (against production)

1. Copy `.env.e2e.example` → `.env.e2e.local` and fill in passwords
2. Seed dedicated test users: `npm run test:e2e:seed`
3. Run tests: `npm run test:e2e`

```bash
# Or inline for one-off runs (PowerShell)
$env:PLAYWRIGHT_BASE_URL="https://incluhub-manager-git-main-pritam2k4s-projects.vercel.app"
$env:E2E_TEST_PASSWORD="your-shared-test-password"
# ... set other E2E_* vars from .env.e2e.example
npm run test:e2e:seed
npm run test:e2e
```

### GitHub Secrets (required for E2E workflow)

| Secret | Value |
|--------|-------|
| `PLAYWRIGHT_BASE_URL` | Production URL (e.g. `https://incluhub-manager-git-main-pritam2k4s-projects.vercel.app`) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | From Vercel → Project → Settings → Deployment Protection → **Protection Bypass for Automation** (required while deployment protection is on) |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as Vercel (for seeding test users) |
| `E2E_SUPER_ADMIN_EMAIL` | `preetam.naik3@gmail.com` |
| `E2E_SUPER_ADMIN_PASSWORD` | Your login password |
| `E2E_MANAGER_EMAIL` | `contact@incluhub.in` |
| `E2E_MANAGER_PASSWORD` | Manager login password |
| `E2E_TEST_PASSWORD` | Shared password for `e2e-editor`, `e2e-viewer`, `e2e-client` (pick a strong test-only password) |

The workflow seeds `e2e-editor@incluhub.in`, `e2e-viewer@incluhub.in`, and `e2e-client@incluhub.in` automatically before each run.

### What gets tested

- Smoke: login page, auth redirects
- Super admin: Admin link, all projects
- Manager: projects without Admin
- Editor: board access + Add task
- Viewer: board access, no Add task, no comment box
- Client: project access + comment box on tasks

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
| `npm run test:e2e` | Playwright E2E (set `PLAYWRIGHT_BASE_URL` for production) |
| `npm run test:e2e:seed` | Create/update E2E test users in Supabase |
| `npm run test:e2e:ui` | Playwright interactive UI mode |

---

Built for **Incluhub**.
