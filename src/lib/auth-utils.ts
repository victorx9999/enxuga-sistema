import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userFactories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
export type UserRole = "admin" | "manager" | "operator";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function getUserFactoryRole(
  userId: string,
  factoryId: string
): Promise<UserRole | null> {
  const uf = await db.query.userFactories.findFirst({
    where: and(
      eq(userFactories.userId, userId),
      eq(userFactories.factoryId, factoryId)
    ),
  });
  return uf?.role ?? null;
}

export async function requireFactoryAccess(
  userId: string,
  factoryId: string,
  minRole?: UserRole
) {
  const role = await getUserFactoryRole(userId, factoryId);
  if (!role) throw new Error("Sem acesso a esta fábrica");

  if (minRole) {
    const hierarchy: Record<UserRole, number> = {
      admin: 3,
      manager: 2,
      operator: 1,
    };
    if (hierarchy[role] < hierarchy[minRole]) {
      throw new Error("Permissão insuficiente");
    }
  }

  return role;
}

export async function getUserFactories(userId: string) {
  return db.query.userFactories.findMany({
    where: eq(userFactories.userId, userId),
    with: {
      factory: {
        with: {
          organization: true,
        },
      },
    },
  });
}
