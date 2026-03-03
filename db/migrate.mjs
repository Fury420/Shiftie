import postgres from "postgres"

const client = postgres(process.env.DATABASE_URL, { ssl: false, max: 1 })

console.log("Running database migrations...")

await client`
  ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false NOT NULL
`

console.log("Migrations complete")
await client.end()
