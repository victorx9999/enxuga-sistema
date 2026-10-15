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
import { eq, and, sql, like } from "drizzle-orm";

export async function getAnnualReportData(factoryId: string, year: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const yearPrefix = `${year}-%`;

  // Production by month and product
  const productionByMonth = await db
    .select({
      month: productionEntries.month,
      productName: products.name,
      totalKg: sql<string>`sum(${productionEntries.weightKg})`,
      count: sql<number>`count(*)::int`,
    })
    .from(productionEntries)
    .innerJoin(products, eq(productionEntries.productId, products.id))
    .where(
      and(
        eq(productionEntries.factoryId, factoryId),
        like(productionEntries.month, yearPrefix)
      )
    )
    .groupBy(productionEntries.month, products.name)
    .orderBy(productionEntries.month, products.name);

  // Material entries by month
  const entriesByMonth = await db
    .select({
      month: materialEntries.month,
      materialName: materials.name,
      totalKg: sql<string>`sum(${materialEntries.weightKg})`,
      totalValue: sql<string>`coalesce(sum(${materialEntries.totalValue}), 0)`,
      totalTax: sql<string>`coalesce(sum(${materialEntries.taxValue}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(materialEntries)
    .innerJoin(materials, eq(materialEntries.materialId, materials.id))
    .where(
      and(
        eq(materialEntries.factoryId, factoryId),
        like(materialEntries.month, yearPrefix)
      )
    )
    .groupBy(materialEntries.month, materials.name)
    .orderBy(materialEntries.month, materials.name);

  // Consumption by month
  const consumptionByMonth = await db
    .select({
      month: materialConsumptions.month,
      materialName: materials.name,
      totalKg: sql<string>`sum(${materialConsumptions.weightKg})`,
    })
    .from(materialConsumptions)
    .innerJoin(materials, eq(materialConsumptions.materialId, materials.id))
    .where(
      and(
        eq(materialConsumptions.factoryId, factoryId),
        like(materialConsumptions.month, yearPrefix)
      )
    )
    .groupBy(materialConsumptions.month, materials.name)
    .orderBy(materialConsumptions.month, materials.name);

  // Expenses by month
  const expensesByMonth = await db
    .select({
      month: expenses.month,
      total: sql<string>`sum(${expenses.value})`,
      count: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.factoryId, factoryId),
        like(expenses.month, yearPrefix)
      )
    )
    .groupBy(expenses.month)
    .orderBy(expenses.month);

  // Losses by month
  const lossesByMonth = await db
    .select({
      month: losses.month,
      totalKg: sql<string>`sum(${losses.weightKg})`,
      count: sql<number>`count(*)::int`,
    })
    .from(losses)
    .where(
      and(
        eq(losses.factoryId, factoryId),
        like(losses.month, yearPrefix)
      )
    )
    .groupBy(losses.month)
    .orderBy(losses.month);

  // Production totals
  const productionTotals = await db
    .select({
      productName: products.name,
      totalKg: sql<string>`sum(${productionEntries.weightKg})`,
      count: sql<number>`count(*)::int`,
    })
    .from(productionEntries)
    .innerJoin(products, eq(productionEntries.productId, products.id))
    .where(
      and(
        eq(productionEntries.factoryId, factoryId),
        like(productionEntries.month, yearPrefix)
      )
    )
    .groupBy(products.name)
    .orderBy(products.name);

  // Material totals
  const materialTotals = await db
    .select({
      materialName: materials.name,
      totalKg: sql<string>`sum(${materialEntries.weightKg})`,
      totalValue: sql<string>`coalesce(sum(${materialEntries.totalValue}), 0)`,
    })
    .from(materialEntries)
    .innerJoin(materials, eq(materialEntries.materialId, materials.id))
    .where(
      and(
        eq(materialEntries.factoryId, factoryId),
        like(materialEntries.month, yearPrefix)
      )
    )
    .groupBy(materials.name)
    .orderBy(materials.name);

  return {
    productionByMonth,
    entriesByMonth,
    consumptionByMonth,
    expensesByMonth,
    lossesByMonth,
    productionTotals,
    materialTotals,
  };
}
