import { config } from "dotenv"
config({ path: ".env.local" })

import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL!, { ssl: false })

async function main() {
  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  console.log("Tables:", tables.map(t => t.tablename).join(", "))

  // Check if shift_replacements exists
  const hasShiftReplacements = tables.some(t => t.tablename === "shift_replacements")
  console.log("shift_replacements exists:", hasShiftReplacements)

  // Check sessions
  const sessions = await sql`SELECT id, user_id, expires_at FROM session ORDER BY created_at DESC LIMIT 3`
  console.log("Sessions:", JSON.stringify(sessions))

  // Check users
  const users = await sql`SELECT id, email, role FROM "user"`
  console.log("Users:", JSON.stringify(users))

  // Check all columns in session table
  const sessionCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'session' ORDER BY ordinal_position`
  console.log("Session columns:", sessionCols.map(c => c.column_name).join(", "))

  await sql.end()
}

main().catch(console.error).finally(() => process.exit(0))
