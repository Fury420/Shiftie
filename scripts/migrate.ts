import { config } from "dotenv"
config({ path: ".env.local" })

import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const client = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(client)

migrate(db, { migrationsFolder: "./db/migrations" })
  .then(() => {
    console.log("Migrácie aplikované.")
    process.exit(0)
  })
  .catch((e) => {
    console.error("Chyba pri migrácii:", e)
    process.exit(1)
  })
