/**
 * One-time script: mark migrations 0000–0004 as already applied in production.
 * Run with production DATABASE_URL so that on next deploy only 0005+ run.
 *
 * Usage: DATABASE_URL="postgres://..." node scripts/baseline-migrations.mjs
 */
import postgres from "postgres"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import crypto from "crypto"

const __dirname = dirname(fileURLToPath(import.meta.url))

try {
  const { config } = await import("dotenv")
  config({ path: ".env.local" })
} catch {}

if (!process.env.DATABASE_URL) {
  console.error("Chyba: nastavte DATABASE_URL (production connection string).")
  process.exit(1)
}

const client = postgres(process.env.DATABASE_URL, { max: 1 })

const journalPath = resolve(__dirname, "../db/migrations/meta/_journal.json")
const journal = JSON.parse(readFileSync(journalPath, "utf8"))

// Entries for 0000–0004 (indices 0–4)
const toBaseline = journal.entries.slice(0, 5)
const migrationsDir = resolve(__dirname, "../db/migrations")

await client`CREATE SCHEMA IF NOT EXISTS drizzle`
await client`
  CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )
`

for (const entry of toBaseline) {
  const sqlPath = resolve(migrationsDir, `${entry.tag}.sql`)
  const query = readFileSync(sqlPath, "utf8")
  const hash = crypto.createHash("sha256").update(query).digest("hex")
  const existing = await client`
    SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = ${entry.when} LIMIT 1
  `
  if (existing.length > 0) {
    console.log(`Skip (already present): ${entry.tag}`)
    continue
  }
  await client`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES (${hash}, ${entry.when})
  `
  console.log(`Baseline: ${entry.tag} (created_at=${entry.when})`)
}

console.log("Baseline done. Next deploy will run only 0005 and 0006.")
await client.end()
process.exit(0)
