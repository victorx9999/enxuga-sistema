"use client";

import { useFactory } from "@/lib/factory-context";
import { useEffect, useState, useTransition } from "react";
import { getWeighings, createWeighing, deleteWeighing } from "@/lib/actions/weighings";
import { getMaterials } from "@/lib/actions/materials";
import { getCurrentMonth } from "@/lib/months";
import { MonthSelector } from "@/components/ui/month-selector";
import { Modal, FormField, inputClass, btnPrimary, btnSecondary } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Scale } from "lucide-react";
import { format } from "date-fns";
import { TableSkeleton } from "@/components/ui/shimmer";

type Weighing = Awaited<ReturnType<typeof getWeighings>>[number];

export default function WeighingPage() {
  const { current } = useFactory();
  const [month, setMonth] = useState(getCurrentMonth());
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [materials, setMaterials] = useState<Awaited<ReturnType<typeof getMaterials>>>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!current) return;
    startTransition(async () => {
      const [w, m] = await Promise.all([
        getWeighings(current.id, month),
        getMaterials(current.id),
      ]);
      setWeighings(w);
      setMaterials(m);
    });
  }, [current, month]);

  function reload() {
    if (!current) return;
    startTransition(async () => setWeighings(await getWeighings(current.id, month)));
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;
    await createWeighing(current.id, {
      materialId: (fd.get("materialId") as string) || undefined,
      date,
      month: date.substring(0, 7),
      weightKg: fd.get("weightKg") as string,
      notes: (fd.get("notes") as string) || undefined,
    });
    setShowAdd(false);
    reload();
  }

  async function handleDelete(id: string) {
    if (!current || !confirm("Excluir pesagem?")) return;
    await deleteWeighing(id, current.id);
    reload();
  }

  if (!current) return null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pesagem</h1>
          <p className="text-sm text-muted mt-1">Conferência de estoque por pesagem</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthSelector value={month} onChange={setMonth} />
          <button onClick={() => setShowAdd(true)} className={btnPrimary}>
            <span className="flex items-center gap-1.5"><Scale size={14} /> Pesar</span>
          </button>
        </div>
      </div>

      {weighings.length === 0 && pending ? <TableSkeleton rows={3} cols={4} /> :
      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <DataTable
          data={weighings}
          onDelete={handleDelete}
          emptyMessage="Nenhuma pesagem registrada no mês."
          columns={[
            { key: "date", label: "Data", render: (w) => format(new Date(w.date + "T12:00:00"), "dd/MM") },
            { key: "material", label: "Material", render: (w) => w.material?.name ?? "Geral" },
            {
              key: "weightKg",
              label: "Peso (kg)",
              render: (w) => (
                <span className="font-medium text-brand">
                  {Number(w.weightKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                </span>
              ),
            },
            { key: "notes", label: "Observações", className: "hidden sm:table-cell" },
            {
              key: "createdByUser",
              label: "Por",
              className: "hidden lg:table-cell",
              render: (w) => w.createdByUser?.name?.split(" ")[0] ?? "—",
            },
          ]}
        />
      </div>}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Registrar pesagem">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="p-4 bg-brand/5 border border-brand/20 rounded-lg text-center">
            <Scale size={32} className="text-brand mx-auto mb-2" />
            <p className="text-xs text-muted">Insira o peso lido na balança</p>
          </div>
          <FormField label="Peso (kg)" required>
            <input
              name="weightKg"
              type="number"
              step="0.01"
              required
              className={`${inputClass} text-center text-2xl font-bold h-14`}
              placeholder="0.00"
              autoFocus
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Material">
              <select name="materialId" className={inputClass}>
                <option value="">— Geral —</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </FormField>
            <FormField label="Data" required>
              <input name="date" type="date" required className={inputClass} defaultValue={format(new Date(), "yyyy-MM-dd")} />
            </FormField>
          </div>
          <FormField label="Observações">
            <input name="notes" className={inputClass} placeholder="Ex: Estoque do armazém A" />
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
