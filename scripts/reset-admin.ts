import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@shiftie.local"
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME ?? "Admin"

  if (!password) {
    console.error("ADMIN_PASSWORD env variable is required.")
    console.error("Usage: ADMIN_PASSWORD=yourpassword npx tsx scripts/reset-admin.ts")
    process.exit(1)
  }

  const { db } = await import("../db")
  const { auth } = await import("../lib/auth")
  const { user, session, account, verification } = await import("../db/schema")
  const { eq } = await import("drizzle-orm")

  console.log("Mazanie všetkých účtov...")

  await db.delete(verification)
  await db.delete(session)
  await db.delete(account)
  await db.delete(user)

  console.log("✓ Všetky účty vymazané")
  console.log("Vytváram admin účet...")

  const result = await auth.api.signUpEmail({
    body: { email, password, name },
  })

  if (!result || "error" in result) {
    console.error("Chyba pri vytváraní účtu:", result)
    process.exit(1)
  }

  await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, email))

  console.log("✓ Admin účet vytvorený")
  console.log(`  Email: ${email}`)
  console.log("  Heslo: ***")
  console.log("  Rola:  admin")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => process.exit(0))
