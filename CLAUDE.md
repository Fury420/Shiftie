# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**OnShift** — employee attendance tracking app for a single bar. Replaces an Excel spreadsheet. Features: clock in/out, monthly hours overview per employee, shift scheduling, and vacation/leave management.

## Stack

- **Next.js 16 + TypeScript** (App Router, Turbopack)
- **Drizzle ORM** + **PostgreSQL** (hosted on Hetzner via Coolify)
- **Better Auth** (email/password, roles: `admin` / `employee`)
- **shadcn/ui** + **Tailwind CSS v4**

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run lint         # ESLint

npm run db:generate  # generate Drizzle migrations from schema
npm run db:migrate   # apply migrations to DB
npm run db:push      # push schema directly (dev only)
npm run db:studio    # open Drizzle Studio (DB GUI)
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — random secret, min 32 chars
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` — app URL

## Architecture

### Auth
- Server config: `lib/auth.ts` — Better Auth instance with Drizzle adapter
- Client config: `lib/auth-client.ts` — exports `signIn`, `signOut`, `signUp`, `useSession`
- API handler: `app/api/auth/[...all]/route.ts`
- Roles are stored on the `user` table (`admin` | `employee`). Admins manage employees, approve leaves, create schedules, and view reports.

### Database (`db/`)
- `schema.ts` — all Drizzle table definitions (Better Auth tables + app tables)
- `index.ts` — DB client singleton (`db` export)
- `migrations/` — generated migration files
- App tables: `shifts`, `attendance`, `leaves`

### Route structure (`app/`)
```
(auth)/login/              # login page
(dashboard)/               # authenticated layout with sidebar
  page.tsx                 # dashboard / overview
  attendance/              # employee: clock in/out, history
  schedule/                # employee: view planned shifts
  leaves/                  # employee: request / view leaves
  admin/                   # admin-only section
    employees/             # manage employees
    schedule/              # create / edit shifts
    leaves/                # approve / reject leave requests
    reports/               # worked hours, exports
api/auth/[...all]/         # Better Auth handler
```

### Adding shadcn/ui components
```bash
npx shadcn@latest add <component>
# e.g. npx shadcn@latest add button table calendar
```
