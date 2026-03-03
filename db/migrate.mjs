import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/migrator"
import postgres from "postgres"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

const client = postgres(process.env.DATABASE_URL, { ssl: false, max: 1 })
const db = drizzle(client)

console.log("Running database migrations...")
await migrate(db, { migrationsFolder: join(__dirname, "migrations") })
console.log("Migrations complete")
await client.end()
