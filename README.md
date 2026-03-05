# Shiftie

Employee attendance tracking app for a single bar. Replaces an Excel spreadsheet.

## Features

- Clock in / clock out
- Monthly hours overview per employee
- Shift scheduling
- Vacation & leave management

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Drizzle ORM** + **PostgreSQL** (hosted on Hetzner via Coolify)
- **Better Auth** — email/password, roles: `admin` / `employee`
- **shadcn/ui** + **Tailwind CSS v4**

## Getting started

```bash
cp .env.example .env.local
# Fill in DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL

npm install
npm run db:migrate
npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Random secret, min 32 chars |
| `BETTER_AUTH_URL` | App URL (used by Better Auth internally) |
| `NEXT_PUBLIC_APP_URL` | App URL (used on the client) |

## Commands

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint

npm run db:generate  # Generate Drizzle migrations from schema
npm run db:migrate   # Apply migrations to DB
npm run db:push      # Push schema directly (dev only)
npm run db:studio    # Open Drizzle Studio (DB GUI)
```

## Seed admin user

To create the initial admin account on a fresh database:

```bash
npx tsx scripts/seed-admin.ts
```

Default credentials (configurable via env):
- `ADMIN_EMAIL` — default: `admin@shiftie.sk`
- `ADMIN_PASSWORD` — default: `changeme123`
- `ADMIN_NAME` — default: `Admin`

## Deployment

Deployed via [Coolify](https://coolify.io) on Hetzner. See `Dockerfile` for the production build setup.
