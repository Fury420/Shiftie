import postgres from "postgres"

const client = postgres(process.env.DATABASE_URL, { ssl: false, max: 1 })

console.log("Running database migrations...")

// ── Previous migrations ────────────────────────────────────────────────────

await client`
  ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false NOT NULL
`

await client`
  ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "hourly_rate" numeric(8, 2)
`

await client`
  ALTER TABLE "attendance"
  ADD COLUMN IF NOT EXISTS "edited_at" timestamp
`

await client`
  ALTER TABLE "attendance"
  ADD COLUMN IF NOT EXISTS "edited_by" text
`

await client`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'attendance_edited_by_user_id_fk'
    ) THEN
      ALTER TABLE "attendance"
      ADD CONSTRAINT "attendance_edited_by_user_id_fk"
      FOREIGN KEY ("edited_by") REFERENCES "user"("id") ON DELETE set null;
    END IF;
  END $$
`

// ── Migration 0004: organizations + superadmin role ────────────────────────

// Add superadmin to role enum (IF NOT EXISTS workaround via DO block)
await client`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'role'::regtype AND enumlabel = 'superadmin'
    ) THEN
      ALTER TYPE "public"."role" ADD VALUE 'superadmin' BEFORE 'admin';
    END IF;
  END $$
`

await client`
  CREATE TABLE IF NOT EXISTS "organizations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )
`

// Seed default organization for existing data
await client`
  INSERT INTO "organizations" ("id", "name")
  VALUES ('00000000-0000-0000-0000-000000000001', 'Hlavný bar')
  ON CONFLICT DO NOTHING
`

await client`ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "organization_id" uuid`
await client`ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "organization_id" uuid`
await client`ALTER TABLE "shift_replacements" ADD COLUMN IF NOT EXISTS "organization_id" uuid`
await client`ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "organization_id" uuid`
await client`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "organization_id" uuid`

// Backfill existing rows
await client`UPDATE "attendance" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "organization_id" IS NULL`
await client`UPDATE "leaves" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "organization_id" IS NULL`
await client`UPDATE "shift_replacements" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "organization_id" IS NULL`
await client`UPDATE "shifts" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "organization_id" IS NULL`
await client`UPDATE "user" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "organization_id" IS NULL AND "role" != 'superadmin'`

// Set NOT NULL on app tables
await client`
  DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'attendance' AND column_name = 'organization_id' AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE "attendance" ALTER COLUMN "organization_id" SET NOT NULL;
    END IF;
  END $$
`
await client`
  DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'leaves' AND column_name = 'organization_id' AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE "leaves" ALTER COLUMN "organization_id" SET NOT NULL;
    END IF;
  END $$
`
await client`
  DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'shift_replacements' AND column_name = 'organization_id' AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE "shift_replacements" ALTER COLUMN "organization_id" SET NOT NULL;
    END IF;
  END $$
`
await client`
  DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'shifts' AND column_name = 'organization_id' AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE "shifts" ALTER COLUMN "organization_id" SET NOT NULL;
    END IF;
  END $$
`

// Add FK constraints (IF NOT EXISTS)
await client`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_organization_id_organizations_id_fk') THEN
      ALTER TABLE "attendance" ADD CONSTRAINT "attendance_organization_id_organizations_id_fk"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;
    END IF;
  END $$
`
await client`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leaves_organization_id_organizations_id_fk') THEN
      ALTER TABLE "leaves" ADD CONSTRAINT "leaves_organization_id_organizations_id_fk"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;
    END IF;
  END $$
`
await client`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_replacements_organization_id_organizations_id_fk') THEN
      ALTER TABLE "shift_replacements" ADD CONSTRAINT "shift_replacements_organization_id_organizations_id_fk"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;
    END IF;
  END $$
`
await client`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shifts_organization_id_organizations_id_fk') THEN
      ALTER TABLE "shifts" ADD CONSTRAINT "shifts_organization_id_organizations_id_fk"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;
    END IF;
  END $$
`
await client`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_organization_id_organizations_id_fk') THEN
      ALTER TABLE "user" ADD CONSTRAINT "user_organization_id_organizations_id_fk"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE set null;
    END IF;
  END $$
`

console.log("Migrations complete")
await client.end()
