"use client";

import { useFactory } from "@/lib/factory-context";
import { useEffect, useState, useTransition } from "react";
import { getProductionEntries, createProductionEntry, deleteProductionEntry } from "@/lib/actions/production";
import { getProducts } from "@/lib/actions/products";
import { getCurrentMonth } from "@/lib/months";
import { MonthSelector } from "@/components/ui/month-selector";
import { Modal, FormField, inputClass, btnPrimary, btnSecondary } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/ui/shimmer";

type Entry = Awaited<ReturnType<typeof getProductionEntries>>[number];
type Product = Awaited<ReturnType<typeof getProducts>>[number];

export default function ProductionPage() {
  const { current } = useFactory();
  const [month, setMonth] = useState(getCurrentMonth());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!current) return;
    startTransition(async () => {
      const [e, p] = await Promise.all([
        getProductionEntries(current.id, month),
        getProducts(current.id),
      ]);
      setEntries(e);
      setProducts(p);
    });
  }, [current, month]);

  function reload() {
    if (!current) return;
    startTransition(async () => setEntries(await getProductionEntries(current.id, month)));
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;
    await createProductionEntry(current.id, {
      productId: fd.get("productId") as string,
      date,
      month: date.substring(0, 7),
      machine: (fd.get("machine") as string) || undefined,
      weaving: fd.get("weaving") ? Number(fd.get("weaving")) : undefined,
      weightKg: fd.get("weightKg") as string,
      rawText: (fd.get("rawText") as string) || undefined,
    });
    setShowAdd(false);
    reload();
  }

  async function handleDelete(id: string) {
    if (!current || !confirm("Excluir lançamento?")) return;
    await deleteProductionEntry(id, current.id);
    reload();
  }

  if (!current) return null;

  const totalKg = entries.reduce((s, e) => s + Number(e.weightKg), 0);
  const loading = entries.length === 0 && pending;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produção</h1>
          <p className="text-sm text-muted mt-1">Lançamentos de produção</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthSelector value={month} onChange={setMonth} />
          <button onClick={() => setShowAdd(true)} className={btnPrimary}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> Lançar</span>
          </button>
        </div>
      </div>

      {loading ? <PageLoading type="table" /> : <>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-brand/5 border border-brand/30 rounded-lg">
          <div className="text-xs text-muted mb-1">Total produzido</div>
          <div className="text-xl font-bold text-brand">
            {totalKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} <span className="text-xs text-muted">kg</span>
          </div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Lançamentos</div>
          <div className="text-xl font-bold">{entries.length}</div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded-lg hidden sm:block">
          <div className="text-xs text-muted mb-1">Média por lançamento</div>
          <div className="text-xl font-bold">
            {entries.length > 0 ? (totalKg / entries.length).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"} <span className="text-xs text-muted">kg</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <DataTable
          data={entries}
          onDelete={handleDelete}
          emptyMessage="Nenhum lançamento de produção no mês."
          columns={[
            {
              key: "date",
              label: "Data",
              render: (e) => format(new Date(e.date + "T12:00:00"), "dd/MM"),
            },
            {
              key: "product",
              label: "Produto",
              render: (e) => e.product.name,
            },
            {
              key: "weightKg",
              label: "Peso (kg)",
              render: (e) => Number(e.weightKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
            },
            { key: "machine", label: "Máquina", className: "hidden sm:table-cell" },
            {
              key: "weaving",
              label: "Tecelagem",
              className: "hidden lg:table-cell",
              render: (e) => e.weaving ?? "—",
            },
            {
              key: "createdByUser",
              label: "Por",
              className: "hidden lg:table-cell",
              render: (e) => e.createdByUser?.name?.split(" ")[0] ?? "—",
            },
          ]}
        />
      </div>
      </>}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Lançar produção">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Produto" required>
              <select name="productId" required className={inputClass}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Data" required>
              <input name="date" type="date" required className={inputClass} defaultValue={format(new Date(), "yyyy-MM-dd")} />
            </FormField>
          </div>
          <FormField label="Peso (kg)" required>
            <input name="weightKg" type="number" step="0.01" required className={inputClass} placeholder="0.00" autoFocus />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Máquina">
              <input name="machine" className={inputClass} placeholder="Ex: Tear 1" />
            </FormField>
            <FormField label="Tecelagem">
              <input name="weaving" type="number" min={1} className={inputClass} defaultValue={1} />
            </FormField>
          </div>
          <FormField label="Observações">
            <input name="rawText" className={inputClass} placeholder="Texto livre" />
          </FormField>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className={btnSecondary}>Cancelar</button>
            <button type="submit" className={btnPrimary}>Lançar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
