"use server"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { organizations, user, userOrganizations } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "@/lib/auth-guard"
import { getSession } from "@/lib/session"
import { cookies } from "next/headers"

export async function createOrganization(data: {
  name: string
  adminName: string
  adminEmail: string
  adminPassword: string
}) {
  await requireSuperAdmin()

  const [org] = await db
    .insert(organizations)
    .values({ name: data.name })
    .returning({ id: organizations.id })

  const result = await auth.api.signUpEmail({
    body: { name: data.adminName, email: data.adminEmail, password: data.adminPassword },
  })

  if (!result || "error" in result) {
    await db.delete(organizations).where(eq(organizations.id, org.id))
    throw new Error("Nepodarilo sa vytvoriť admin účet. Email možno už existuje.")
  }

  await db
    .update(user)
    .set({
      role: "admin",
      organizationId: org.id,
      emailVerified: true,
      mustChangePassword: true,
    })
    .where(eq(user.email, data.adminEmail))

  await db
    .insert(userOrganizations)
    .values({ userId: result.user.id, organizationId: org.id })
    .onConflictDoNothing()

  revalidatePath("/superadmin")
}

export async function switchOrganization(orgId: string) {
  const session = await getSession()
  if (!session) throw new Error("Neprihlásený")

  const [membership] = await db
    .select({ organizationId: userOrganizations.organizationId })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, session.user.id),
        eq(userOrganizations.organizationId, orgId),
      ),
    )
    .limit(1)

  if (!membership) throw new Error("Nemáš prístup k tejto organizácii")

  const cookieStore = await cookies()
  cookieStore.set("activeOrgId", orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath("/", "layout")
}

export async function deleteOrganization(id: string) {
  await requireSuperAdmin()
  await db.delete(organizations).where(eq(organizations.id, id))
  revalidatePath("/superadmin")
}

export async function updateOrganization(id: string, data: { name: string }) {
  await requireSuperAdmin()

  await db
    .update(organizations)
    .set({ name: data.name, updatedAt: new Date() })
    .where(eq(organizations.id, id))

  revalidatePath("/superadmin")
}
