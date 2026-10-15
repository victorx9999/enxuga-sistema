"use server";

import { db } from "@/lib/db";
import {
  materials,
  materialEntries,
  materialBalances,
} from "@/lib/db/schema";
import { requireAuth, requireFactoryAccess } from "@/lib/auth-utils";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getMaterials(factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  return db.query.materials.findMany({
    where: eq(materials.factoryId, factoryId),
    orderBy: (m, { asc }) => [asc(m.name)],
  });
}

export async function createMaterial(
  factoryId: string,
  data: { name: string; unit?: string }
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  const [material] = await db
    .insert(materials)
    .values({ factoryId, name: data.name, unit: data.unit ?? "kg" })
    .returning();

  revalidatePath("/stock");
  return material;
}

export async function updateMaterial(
  materialId: string,
  factoryId: string,
  data: { name?: string; unit?: string }
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  const [material] = await db
    .update(materials)
    .set(data)
    .where(and(eq(materials.id, materialId), eq(materials.factoryId, factoryId)))
    .returning();

  revalidatePath("/stock");
  return material;
}

export async function deleteMaterial(materialId: string, factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "admin");

  await db.delete(materials).where(
    and(eq(materials.id, materialId), eq(materials.factoryId, factoryId))
  );

  revalidatePath("/stock");
}

export async function getMaterialEntries(factoryId: string, month?: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const conditions = [eq(materialEntries.factoryId, factoryId)];
  if (month) conditions.push(eq(materialEntries.month, month));

  return db.query.materialEntries.findMany({
    where: and(...conditions),
    with: { material: true, createdByUser: true },
    orderBy: (e, { desc }) => [desc(e.date)],
  });
}

export async function createMaterialEntry(
  factoryId: string,
  data: {
    materialId: string;
    date: string;
    month: string;
    invoiceNumber?: string;
    fiberType?: string;
    boxes?: string;
    kgPerBox?: string;
    weightKg: string;
    invoiceValue?: string;
    taxPercent?: string;
    taxValue?: string;
    unitValue?: string;
    totalValue?: string;
    paymentDate?: string;
    paymentMethod?: string;
    paidBy?: string;
    notes?: string;
  }
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "operator");

  const [entry] = await db
    .insert(materialEntries)
    .values({ factoryId, ...data, createdBy: user.id })
    .returning();

  revalidatePath("/stock");
  return entry;
}

export async function deleteMaterialEntry(entryId: string, factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  await db.delete(materialEntries).where(
    and(eq(materialEntries.id, entryId), eq(materialEntries.factoryId, factoryId))
  );

  revalidatePath("/stock");
}

export async function getMaterialBalances(factoryId: string, month: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  return db.query.materialBalances.findMany({
    where: and(
      eq(materialBalances.factoryId, factoryId),
      eq(materialBalances.month, month)
    ),
    with: { material: true },
  });
}

export async function setMaterialBalance(
  factoryId: string,
  data: { materialId: string; month: string; weightKg: string; boxes?: string; unitValue?: string }
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  await db
    .insert(materialBalances)
    .values({ factoryId, ...data })
    .onConflictDoUpdate({
      target: [materialBalances.factoryId, materialBalances.materialId, materialBalances.month],
      set: { weightKg: data.weightKg, boxes: data.boxes, unitValue: data.unitValue },
    });

  revalidatePath("/stock");
}
