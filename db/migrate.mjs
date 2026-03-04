import postgres from "postgres"

const client = postgres(process.env.DATABASE_URL, { ssl: false, max: 1 })

console.log("Running database migrations...")

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

console.log("Migrations complete")
await client.end()
