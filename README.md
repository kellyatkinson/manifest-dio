# Manifest

Editable portfolio inventory for the Diocesan School for Girls BIM team.

Manifest is the system-of-record version of the BIM portfolio: a single, signed-in admin (Kelly) maintains an inventory of projects, programmes and annual cycles, plus the tasks against each project and the decisions that shape the portfolio. Status and owner reads from Marcus and Indy are flagged as inferences until Kelly confirms or corrects them; every edit is captured in an append-only history.

Based on the conventions established in Kelly's [focus-group signup app](https://github.com/kellyatkinson/dio-focus-group-signup).

## Stack

- **Frontend:** Vite + React + TypeScript (strict mode), CSS Modules
- **Routing:** React Router v6
- **Server state:** TanStack React Query
- **Backend:** Supabase (PostgreSQL + Auth + RLS + RPCs)
- **Auth:** Google OAuth via Supabase, restricted to `@diocesan.school.nz`
- **Hosting:** Vercel (static site, SPA fallback)

## Project structure

```text
manifest-dio/
|-- index.html
|-- package.json
|-- vite.config.ts
|-- tsconfig.json
|-- vercel.json              # cleanUrls + SPA fallback
|-- .env.example             # client-safe env vars only
|-- src/
|   |-- main.tsx             # entrypoint
|   |-- App.tsx              # router + react-query provider
|   |-- lib/
|   |   |-- supabase.ts      # createClient singleton
|   |   |-- auth.ts          # signInWithGoogle, signOut, useUser, useIsAdmin
|   |   |-- api.ts           # RPC wrappers + PostgREST reads
|   |   |-- types.ts         # hand-written DB row types
|   |   `-- format.ts        # NZ date/time, status severity, label helpers
|   |-- hooks/
|   |   |-- useProjects.ts   # React Query hooks for projects + mutations
|   |   |-- useTasks.ts      # React Query hooks for tasks + mutations
|   |   |-- useHistory.ts    # project_history / task_history
|   |   `-- useReference.ts  # cached reference-table dropdowns
|   |-- pages/
|   |   |-- Login.tsx
|   |   |-- Portfolio.tsx       # main table, mirrors portfolio.html
|   |   |-- ProjectDetail.tsx   # project info + tasks + history
|   |   |-- TaskDetail.tsx      # modal over ProjectDetail
|   |   |-- Decisions.tsx       # resolved questions log
|   |   `-- NotFound.tsx
|   |-- components/             # Layout, Sidebar, Header, ProjectTable etc.
|   `-- styles/
|       |-- tokens.css          # design tokens (Dio palette)
|       `-- reset.css
```

Schema, RPCs and design notes live in the companion folder under OneDrive (`01 projects/Portfolio Inventory/app/`): `schema.sql`, `drop_all.sql`, the design notes from Arjun and Scout.

## Setup checklist

1. **Clone the repo.**

   ```sh
   git clone https://github.com/kellyatkinson/manifest-dio.git
   cd manifest-dio
   ```

2. **Install dependencies.**

   ```sh
   npm install
   ```

   Node 20+ recommended (see `.nvmrc`).

3. **Copy `.env.example` to `.env.local`** and fill in the Supabase values:

   ```env
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

   Both keys are client-safe. Never put the Supabase service-role key in a `VITE_` variable — it would be bundled into the browser build.

4. **Create or reuse a Supabase project.**

   Manifest can share a Supabase project with the focus-group app (different table namespace, no collisions) or live in its own project.

5. **Run the schema.** In the Supabase SQL Editor, paste and run:

   - `app/drop_all.sql` (only if you are resetting an existing Manifest install).
   - `app/schema.sql` — idempotent, re-runnable. Creates all tables, indexes, RLS policies, RPCs, and seed data (reference tables, settings, Kelly as the only admin).

   The schema file is at `01 projects/Portfolio Inventory/app/schema.sql` in OneDrive — it does not live in this repo.

6. **Configure Google OAuth in Supabase.**

   - In the Supabase dashboard, go to **Authentication > Providers** and enable **Google**.
   - Create Google OAuth credentials in the Google Cloud Console if you do not already have them.
   - Add this callback URI to the Google OAuth client:
     `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - In Supabase **Auth > Settings**, set the **Site URL** to the deployed app URL and add `http://localhost:5173` to the redirect URL list for local development.

7. **Confirm the admin allowlist.** Open `public.admins` in Supabase Table Editor; ensure `katkinson@diocesan.school.nz` is present. Anyone you want to grant admin write access to must also appear here.

8. **Run locally.**

   ```sh
   npm run dev
   ```

   Vite serves on `http://localhost:5173`. The Login screen redirects you to Google; once you sign in the portfolio table loads.

## Running locally

| Command            | What it does                                            |
|--------------------|---------------------------------------------------------|
| `npm run dev`      | Vite dev server with HMR, on port 5173                  |
| `npm run build`    | TypeScript build then `vite build` (writes `dist/`)     |
| `npm run preview`  | Serve the production build locally                      |
| `npm run typecheck`| Type-check without emitting                             |

## Deploying to Vercel

1. Push the repo to GitHub.
2. **Import to Vercel.** Framework preset: **Vite**. Root directory: project root (the `manifest-dio` folder itself).
3. **Environment variables.** In Project Settings > Environment Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for **Production**, **Preview**, and **Development**.
4. **First deploy** triggers automatically on push.
5. **Update Supabase redirect URLs.** Add the Vercel production URL plus the preview wildcard (e.g. `https://manifest-dio-*.vercel.app/**`) to Supabase Auth's redirect URL list, otherwise the OAuth flow fails on previews.

`vercel.json` already wires up `cleanUrls` and the SPA fallback rewrite so client-side routes deep-link correctly.

## Database schema (one-paragraph summary)

`projects` is the master table — UUID PKs, free-text deadline (intentionally, because many real values are `"TBD"`, `"Vendor-dependent"`, etc.), inference flags on status and owner. `project_states` is a state machine — `active`, `archived`, `hidden_out_of_scope` — and nothing ever gets DELETEd from `projects`. `tasks` hangs off `projects` via a single FK; `task_history` and `project_history` are append-only audit tables populated by the RPCs. Reference tables (`project_types`, `project_statuses`, `project_states`, `confidence_levels`, `task_statuses`) use stable text PKs with `display_order` for UI sort. RLS locks down all tables to SELECT-only for authenticated users; writes go through `SECURITY DEFINER` RPCs that check `public.admins`. The full schema, the RPC inventory, and the design rationale live in `01 projects/Portfolio Inventory/app/` under OneDrive.

## Common admin tasks

- **Add a new project.** Use the "Add project" affordance from the portfolio page (UI for this in v1 is the project detail form; a top-level "+ New project" button is on the v2 backlog). Alternatively, insert via `admin_create_project` RPC in the Supabase SQL editor with a JSON payload.
- **Confirm an inferred field.** Click the † next to an inferred status or owner cell on the portfolio table. The popover offers "Confirm as-is" (writes a history row, clears the `_inferred` flag) or "Change to …" (writes a history row with the new value).
- **Archive a project.** On the project detail page, change the **State** dropdown to "Archived (closed)". You'll be prompted for an optional reason.
- **Hide a project as out-of-scope.** Same dropdown, choose "Hidden / out of scope". This is for the "Year 14s / asset-disposal" pattern — items that were on the list but should not have been. State changes always write a history row.
- **Add a decision.** Resolved Questions page > "Add decision". Project link is optional — leave blank for portfolio-wide decisions.
- **Add an admin.** Run in Supabase SQL Editor:

  ```sql
  insert into public.admins (email) values ('newadmin@diocesan.school.nz')
  on conflict (email) do nothing;
  ```

- **Re-run the schema.** `app/schema.sql` is idempotent — every `create` is `if not exists` or `or replace`, and seed inserts are `on conflict do update`. Safe to re-paste at any time.
- **Clean-slate reset.** Run `app/drop_all.sql` in the SQL editor before re-running `schema.sql`.

## Notes for the next maintainer

- All writes go through named RPCs (`admin_*`). Direct table inserts will be rejected by RLS — this is intentional and mirrors the focus-group convention. New editable fields need both a column on the table and a path through the corresponding `admin_update_*` RPC.
- Dates are stored as `timestamptz` / `date`; display formatting (`Pacific/Auckland`, `en-NZ`) happens in `src/lib/format.ts`. Sortable keys use `en-CA` because it produces `YYYY-MM-DD`.
- The Supabase publishable / anon key is safe to ship to the browser. The service-role key is not — keep it out of any `VITE_` variable.
- Tasks have inert Todoist sync columns (`todoist_id`, `todoist_url`, `last_synced_at`, `sync_source`). No sync logic exists yet; the columns are in place so a future job can populate them without a migration.
