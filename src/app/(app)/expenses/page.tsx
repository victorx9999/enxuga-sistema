"use client";

import { useFactory } from "@/lib/factory-context";
import { useEffect, useState, useTransition } from "react";
import { getExpenses, createExpense, deleteExpense } from "@/lib/actions/expenses";
import { getCurrentMonth } from "@/lib/months";
import { MonthSelector } from "@/components/ui/month-selector";
import { Modal, FormField, inputClass, btnPrimary, btnSecondary } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/ui/shimmer";

type Expense = Awaited<ReturnType<typeof getExpenses>>[number];

export default function ExpensesPage() {
  const { current } = useFactory();
  const [month, setMonth] = useState(getCurrentMonth());
  const [expenses, setExpensesList] = useState<Expense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!current) return;
    startTransition(async () => setExpensesList(await getExpenses(current.id, month)));
  }, [current, month]);

  function reload() {
    if (!current) return;
    startTransition(async () => setExpensesList(await getExpenses(current.id, month)));
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;
    await createExpense(current.id, {
      date,
      month: date.substring(0, 7),
      description: fd.get("description") as string,
      value: fd.get("value") as string,
      paidBy: (fd.get("paidBy") as string) || undefined,
    });
    setShowAdd(false);
    reload();
  }

  async function handleDelete(id: string) {
    if (!current || !confirm("Excluir despesa?")) return;
    await deleteExpense(id, current.id);
    reload();
  }

  if (!current) return null;

  const total = expenses.reduce((s, e) => s + Number(e.value), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <p className="text-sm text-muted mt-1">Gastos operacionais da fábrica</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthSelector value={month} onChange={setMonth} />
          <button onClick={() => setShowAdd(true)} className={btnPrimary}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> Nova despesa</span>
          </button>
        </div>
      </div>

      {expenses.length === 0 && pending ? <PageLoading type="table" /> : <>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Total de despesas</div>
          <div className="text-xl font-bold">
            {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Quantidade</div>
          <div className="text-xl font-bold">{expenses.length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <DataTable
          data={expenses}
          onDelete={handleDelete}
          emptyMessage="Nenhuma despesa no mês."
          columns={[
            {
              key: "date",
              label: "Data",
              render: (e) => format(new Date(e.date + "T12:00:00"), "dd/MM"),
            },
            { key: "description", label: "Descrição" },
            {
              key: "value",
              label: "Valor",
              render: (e) => Number(e.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            },
            {
              key: "paidBy",
              label: "Pago por",
              className: "hidden sm:table-cell",
            },
          ]}
        />
      </div>
      </>}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nova despesa">
        <form onSubmit={handleAdd} className="space-y-4">
          <FormField label="Descrição" required>
            <input name="description" required className={inputClass} placeholder="Ex: Energia elétrica" autoFocus />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Valor (R$)" required>
              <input name="value" type="number" step="0.01" required className={inputClass} placeholder="0.00" />
            </FormField>
            <FormField label="Data" required>
              <input name="date" type="date" required className={inputClass} defaultValue={format(new Date(), "yyyy-MM-dd")} />
            </FormField>
          </div>
          <FormField label="Pago por">
            <input name="paidBy" className={inputClass} placeholder="Ex: Victor" />
          </FormField>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className={btnSecondary}>Cancelar</button>
            <button type="submit" className={btnPrimary}>Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
