import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { db } = await import("../db")
  const { auth } = await import("../lib/auth")
  const { user, session, account, verification } = await import("../db/schema")
  const { eq } = await import("drizzle-orm")

  console.log("Mazanie všetkých účtov...")

  // Poradie: najprv závislé tabuľky, potom user
  await db.delete(verification)
  await db.delete(session)
  await db.delete(account)
  await db.delete(user)

  console.log("✓ Všetky účty vymazané")

  console.log("Vytváram admin účet...")

  const result = await auth.api.signUpEmail({
    body: {
      email: "info@relaxfitness.sk",
      password: "12345678",
      name: "Admin",
    },
  })

  if (!result || "error" in result) {
    console.error("Chyba pri vytváraní účtu:", result)
    process.exit(1)
  }

  await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, "info@relaxfitness.sk"))

  console.log("✓ Admin účet vytvorený")
  console.log("  Email: info@relaxfitness.sk")
  console.log("  Heslo: 12345678")
  console.log("  Rola:  admin")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => process.exit(0))
