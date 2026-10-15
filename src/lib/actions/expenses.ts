"use server";

import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { requireAuth, requireFactoryAccess } from "@/lib/auth-utils";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getExpenses(factoryId: string, month?: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const conditions = [eq(expenses.factoryId, factoryId)];
  if (month) conditions.push(eq(expenses.month, month));

  return db.query.expenses.findMany({
    where: and(...conditions),
    with: { createdByUser: true },
    orderBy: (e, { desc }) => [desc(e.date)],
  });
}

export async function createExpense(
  factoryId: string,
  data: {
    date: string;
    month: string;
    description: string;
    value: string;
    paidBy?: string;
  }
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "operator");

  const [expense] = await db
    .insert(expenses)
    .values({ factoryId, ...data, createdBy: user.id })
    .returning();

  revalidatePath("/expenses");
  return expense;
}

export async function deleteExpense(expenseId: string, factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  await db.delete(expenses).where(
    and(eq(expenses.id, expenseId), eq(expenses.factoryId, factoryId))
  );

  revalidatePath("/expenses");
}

export async function getExpenseSummary(factoryId: string, month: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const result = await db
    .select({
      total: sql<string>`coalesce(sum(${expenses.value}), '0')`,
      count: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .where(
      and(eq(expenses.factoryId, factoryId), eq(expenses.month, month))
    );

  return result[0];
}
