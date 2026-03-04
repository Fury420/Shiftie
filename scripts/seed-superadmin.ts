/**
 * One-time script to create the superadmin user.
 * Usage: npx tsx scripts/seed-superadmin.ts
 *
 * Edit the values below before running.
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"

const NAME = "Super Admin"
const EMAIL = "superadmin@shiftie.sk"
const PASSWORD = "zmenHeslo123!" // will be force-changed on first login

async function main() {
  console.log("Creating superadmin user...")

  const result = await auth.api.signUpEmail({
    body: { name: NAME, email: EMAIL, password: PASSWORD },
  })

  if (!result || "error" in result) {
    console.error("Failed to create account. Email may already exist.")
    process.exit(1)
  }

  await db
    .update(user)
    .set({
      role: "superadmin",
      organizationId: null,
      emailVerified: true,
      mustChangePassword: true,
    })
    .where(eq(user.email, EMAIL))

  console.log(`Superadmin created: ${EMAIL}`)
  console.log(`Temporary password: ${PASSWORD}`)
  console.log("Login and change the password immediately.")
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
