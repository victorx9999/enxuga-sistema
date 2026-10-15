"use client";

import { useFactory } from "@/lib/factory-context";
import { useEffect, useState, useTransition } from "react";
import { getLosses, createLoss, deleteLoss } from "@/lib/actions/losses";
import { getProducts } from "@/lib/actions/products";
import { getMaterials } from "@/lib/actions/materials";
import { getCurrentMonth } from "@/lib/months";
import { MonthSelector } from "@/components/ui/month-selector";
import { Modal, FormField, inputClass, btnPrimary, btnSecondary } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/ui/shimmer";

type Loss = Awaited<ReturnType<typeof getLosses>>[number];

export default function LossesPage() {
  const { current } = useFactory();
  const [month, setMonth] = useState(getCurrentMonth());
  const [losses, setLosses] = useState<Loss[]>([]);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof getProducts>>>([]);
  const [materials, setMaterials] = useState<Awaited<ReturnType<typeof getMaterials>>>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!current) return;
    startTransition(async () => {
      const [l, p, m] = await Promise.all([
        getLosses(current.id, month),
        getProducts(current.id),
        getMaterials(current.id),
      ]);
      setLosses(l);
      setProducts(p);
      setMaterials(m);
    });
  }, [current, month]);

  function reload() {
    if (!current) return;
    startTransition(async () => setLosses(await getLosses(current.id, month)));
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;
    await createLoss(current.id, {
      productId: (fd.get("productId") as string) || undefined,
      materialId: (fd.get("materialId") as string) || undefined,
      date,
      month: date.substring(0, 7),
      weightKg: fd.get("weightKg") as string,
      reason: (fd.get("reason") as string) || undefined,
    });
    setShowAdd(false);
    reload();
  }

  async function handleDelete(id: string) {
    if (!current || !confirm("Excluir registro de perda?")) return;
    await deleteLoss(id, current.id);
    reload();
  }

  if (!current) return null;

  const totalKg = losses.reduce((s, l) => s + Number(l.weightKg), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perdas</h1>
          <p className="text-sm text-muted mt-1">Rastreamento de perdas de material e produto</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthSelector value={month} onChange={setMonth} />
          <button onClick={() => setShowAdd(true)} className={btnPrimary}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> Registrar</span>
          </button>
        </div>
      </div>

      {losses.length === 0 && pending ? <PageLoading type="table" /> : <>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-danger/5 border border-danger/30 rounded-lg">
          <div className="text-xs text-muted mb-1">Total de perdas</div>
          <div className="text-xl font-bold text-danger">
            {totalKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} <span className="text-xs text-muted">kg</span>
          </div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Registros</div>
          <div className="text-xl font-bold">{losses.length}</div>
        </div>
      </div>

      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <DataTable
          data={losses}
          onDelete={handleDelete}
          emptyMessage="Nenhuma perda registrada no mês."
          columns={[
            { key: "date", label: "Data", render: (l) => format(new Date(l.date + "T12:00:00"), "dd/MM") },
            { key: "product", label: "Produto", render: (l) => l.product?.name ?? "—" },
            { key: "material", label: "Material", render: (l) => l.material?.name ?? "—" },
            { key: "weightKg", label: "Peso (kg)", render: (l) => Number(l.weightKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) },
            { key: "reason", label: "Motivo", className: "hidden sm:table-cell" },
          ]}
        />
      </div>
      </>}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Registrar perda">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Produto">
              <select name="productId" className={inputClass}>
                <option value="">— Nenhum —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
            <FormField label="Material">
              <select name="materialId" className={inputClass}>
                <option value="">— Nenhum —</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Peso (kg)" required>
              <input name="weightKg" type="number" step="0.01" required className={inputClass} placeholder="0.00" autoFocus />
            </FormField>
            <FormField label="Data" required>
              <input name="date" type="date" required className={inputClass} defaultValue={format(new Date(), "yyyy-MM-dd")} />
            </FormField>
          </div>
          <FormField label="Motivo">
            <input name="reason" className={inputClass} placeholder="Ex: Fio quebrado, defeito..." />
          </FormField>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className={btnSecondary}>Cancelar</button>
            <button type="submit" className={btnPrimary}>Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
