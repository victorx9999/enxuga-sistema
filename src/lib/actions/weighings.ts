"use server";

import { db } from "@/lib/db";
import { weighings } from "@/lib/db/weighing-schema";
import { requireAuth, requireFactoryAccess } from "@/lib/auth-utils";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getWeighings(factoryId: string, month?: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const conditions = [eq(weighings.factoryId, factoryId)];
  if (month) conditions.push(eq(weighings.month, month));

  return db.query.weighings.findMany({
    where: and(...conditions),
    with: { material: true, createdByUser: true },
    orderBy: (e, { desc }) => [desc(e.date)],
  });
}

export async function createWeighing(
  factoryId: string,
  data: {
    materialId?: string;
    date: string;
    month: string;
    weightKg: string;
    photoUrl?: string;
    notes?: string;
  }
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "operator");

  const [weighing] = await db
    .insert(weighings)
    .values({ factoryId, ...data, createdBy: user.id })
    .returning();

  revalidatePath("/weighing");
  return weighing;
}

export async function deleteWeighing(weighingId: string, factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  await db.delete(weighings).where(
    and(eq(weighings.id, weighingId), eq(weighings.factoryId, factoryId))
  );

  revalidatePath("/weighing");
}
