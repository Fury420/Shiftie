import { config } from "dotenv"
config({ path: ".env.local" })

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@shiftie.sk"
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Admin"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme123"

async function main() {
  // Dynamické importy musia byť až tu — po config() — inak db nemá DATABASE_URL
  const { auth } = await import("../lib/auth")
  const { db } = await import("../db")
  const { user } = await import("../db/schema")
  const { eq } = await import("drizzle-orm")

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL))
    .limit(1)

  if (existing.length > 0) {
    console.log(`Admin účet už existuje: ${ADMIN_EMAIL}`)
    return
  }

  const result = await auth.api.signUpEmail({
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: ADMIN_NAME },
  })

  if (!result || "error" in result) {
    console.error("Chyba pri vytváraní účtu:", result)
    process.exit(1)
  }

  await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, ADMIN_EMAIL))

  console.log("✓ Admin účet vytvorený")
  console.log(`  Email:  ${ADMIN_EMAIL}`)
  console.log(`  Heslo:  ${ADMIN_PASSWORD}`)
  console.log("  ⚠ Zmeňte heslo po prvom prihlásení!")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => process.exit(0))
