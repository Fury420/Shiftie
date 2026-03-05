import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

// Load .env.local if present (local dev)
try {
  const { config } = await import("dotenv")
  config({ path: ".env.local" })
} catch {}

const __dirname = dirname(fileURLToPath(import.meta.url))

const client = postgres(process.env.DATABASE_URL, { max: 1 })
const db = drizzle(client)

migrate(db, { migrationsFolder: resolve(__dirname, "../db/migrations") })
  .then(() => {
    console.log("Migrácie aplikované.")
    process.exit(0)
  })
  .catch((e) => {
    console.error("Chyba pri migrácii:", e)
    process.exit(1)
  })
