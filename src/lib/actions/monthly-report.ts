"use server";

import { db } from "@/lib/db";
import {
  materials,
  materialEntries,
  materialConsumptions,
  productionEntries,
  products,
  expenses,
} from "@/lib/db/schema";
import { losses } from "@/lib/db/weighing-schema";
import { requireAuth, requireFactoryAccess } from "@/lib/auth-utils";
import { eq, and, sql } from "drizzle-orm";

export async function getMonthlyReportData(factoryId: string, month: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const productionByProduct = await db
    .select({
      productName: products.name,
      totalKg: sql<string>`sum(${productionEntries.weightKg})`,
      count: sql<number>`count(*)::int`,
    })
    .from(productionEntries)
    .innerJoin(products, eq(productionEntries.productId, products.id))
    .where(and(eq(productionEntries.factoryId, factoryId), eq(productionEntries.month, month)))
    .groupBy(products.name)
    .orderBy(products.name);

  const productionDetails = await db
    .select({
      date: productionEntries.date,
      productName: products.name,
      machine: productionEntries.machine,
      weaving: productionEntries.weaving,
      weightKg: productionEntries.weightKg,
    })
    .from(productionEntries)
    .innerJoin(products, eq(productionEntries.productId, products.id))
    .where(and(eq(productionEntries.factoryId, factoryId), eq(productionEntries.month, month)))
    .orderBy(productionEntries.date);

  const materialEntriesData = await db
    .select({
      date: materialEntries.date,
      materialName: materials.name,
      invoiceNumber: materialEntries.invoiceNumber,
      weightKg: materialEntries.weightKg,
      unitValue: materialEntries.unitValue,
      totalValue: materialEntries.totalValue,
      taxValue: materialEntries.taxValue,
      paymentMethod: materialEntries.paymentMethod,
    })
    .from(materialEntries)
    .innerJoin(materials, eq(materialEntries.materialId, materials.id))
    .where(and(eq(materialEntries.factoryId, factoryId), eq(materialEntries.month, month)))
    .orderBy(materialEntries.date);

  const consumptionByMaterial = await db
    .select({
      materialName: materials.name,
      totalKg: sql<string>`sum(${materialConsumptions.weightKg})`,
    })
    .from(materialConsumptions)
    .innerJoin(materials, eq(materialConsumptions.materialId, materials.id))
    .where(and(eq(materialConsumptions.factoryId, factoryId), eq(materialConsumptions.month, month)))
    .groupBy(materials.name)
    .orderBy(materials.name);

  const expensesList = await db
    .select({
      date: expenses.date,
      description: expenses.description,
      value: expenses.value,
      paidBy: expenses.paidBy,
    })
    .from(expenses)
    .where(and(eq(expenses.factoryId, factoryId), eq(expenses.month, month)))
    .orderBy(expenses.date);

  const lossesList = await db
    .select({
      date: losses.date,
      productName: products.name,
      materialName: materials.name,
      weightKg: losses.weightKg,
      reason: losses.reason,
    })
    .from(losses)
    .leftJoin(products, eq(losses.productId, products.id))
    .leftJoin(materials, eq(losses.materialId, materials.id))
    .where(and(eq(losses.factoryId, factoryId), eq(losses.month, month)))
    .orderBy(losses.date);

  return {
    productionByProduct,
    productionDetails,
    materialEntries: materialEntriesData,
    consumptionByMaterial,
    expenses: expensesList,
    losses: lossesList,
  };
}
