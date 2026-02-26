import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { db } = await import("../db")
  const { user } = await import("../db/schema")

  const allUsers = await db.select({ id: user.id, name: user.name }).from(user)
  console.log("Používatelia:", allUsers.map(u => u.name).join(", "))

  for (const u of allUsers) {
    const name = u.name.toLowerCase()

    if (name.includes("tati") || name.includes("tana")) {
      await db.update(user).set({
        defaultDays: "5,6,0",
        defaultStartTime: "15:00",
        defaultEndTime: "21:00",
      }).where((await import("drizzle-orm")).eq(user.id, u.id))
      console.log(`✓ ${u.name} → Pi,So,Ne | 15:00–21:00`)
    }

    if (name.includes("michal")) {
      await db.update(user).set({
        defaultDays: "1,2,3,4",
        defaultStartTime: "16:00",
        defaultEndTime: "21:00",
      }).where((await import("drizzle-orm")).eq(user.id, u.id))
      console.log(`✓ ${u.name} → Po,Ut,St,Št | 16:00–21:00`)
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => process.exit(0))
