"use client";

import { useFactory } from "@/lib/factory-context";
import { useEffect, useState, useTransition } from "react";
import {
  getMaterials,
  getMaterialEntries,
  createMaterialEntry,
  deleteMaterialEntry,
} from "@/lib/actions/materials";
import { getCurrentMonth } from "@/lib/months";
import { MonthSelector } from "@/components/ui/month-selector";
import { Modal, FormField, inputClass, btnPrimary, btnSecondary } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import { format } from "date-fns";

type Material = Awaited<ReturnType<typeof getMaterials>>[number];
type Entry = Awaited<ReturnType<typeof getMaterialEntries>>[number];

export default function EntradasPage() {
  const { current } = useFactory();
  const [month, setMonth] = useState(getCurrentMonth());
  const [materials, setMaterials] = useState<Material[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!current) return;
    startTransition(async () => {
      const [m, e] = await Promise.all([
        getMaterials(current.id),
        getMaterialEntries(current.id, month),
      ]);
      setMaterials(m);
      setEntries(e);
    });
  }, [current, month]);

  function reload() {
    if (!current) return;
    startTransition(async () => {
      const [m, e] = await Promise.all([
        getMaterials(current.id),
        getMaterialEntries(current.id, month),
      ]);
      setMaterials(m);
      setEntries(e);
    });
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;
    await createMaterialEntry(current.id, {
      materialId: fd.get("materialId") as string,
      date,
      month: date.substring(0, 7),
      invoiceNumber: (fd.get("invoiceNumber") as string) || undefined,
      fiberType: (fd.get("fiberType") as string) || undefined,
      weightKg: fd.get("weightKg") as string,
      boxes: (fd.get("boxes") as string) || undefined,
      kgPerBox: (fd.get("kgPerBox") as string) || undefined,
      invoiceValue: (fd.get("invoiceValue") as string) || undefined,
      taxPercent: (fd.get("taxPercent") as string) || undefined,
      taxValue: (fd.get("taxValue") as string) || undefined,
      unitValue: (fd.get("unitValue") as string) || undefined,
      totalValue: (fd.get("totalValue") as string) || undefined,
      paymentDate: (fd.get("paymentDate") as string) || undefined,
      paymentMethod: (fd.get("paymentMethod") as string) || undefined,
      paidBy: (fd.get("paidBy") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    });
    setShowAdd(false);
    reload();
  }

  async function handleDelete(id: string) {
    if (!current || !confirm("Excluir entrada?")) return;
    await deleteMaterialEntry(id, current.id);
    reload();
  }

  if (!current) return null;

  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const fmtBrl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalKg = entries.reduce((s, e) => s + Number(e.weightKg), 0);
  const totalValue = entries.reduce((s, e) => s + Number(e.totalValue || 0), 0);
  const totalTax = entries.reduce((s, e) => s + Number(e.taxValue || 0), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entradas</h1>
          <p className="text-sm text-muted mt-1">Entradas de fio e materiais</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthSelector value={month} onChange={setMonth} />
          <button onClick={() => setShowAdd(true)} className={btnPrimary}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> Nova entrada</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Entradas no mês</div>
          <div className="text-xl font-bold">{entries.length}</div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Total peso (kg)</div>
          <div className="text-xl font-bold">{fmt(totalKg)}</div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Valor total</div>
          <div className="text-xl font-bold">{fmtBrl(totalValue)}</div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Total impostos</div>
          <div className="text-xl font-bold">{fmtBrl(totalTax)}</div>
        </div>
      </div>

      {/* Entries table */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-x-auto">
        <DataTable
          data={entries}
          onDelete={handleDelete}
          emptyMessage="Nenhuma entrada no mês."
          columns={[
            {
              key: "date",
              label: "Data",
              render: (e) => format(new Date(e.date + "T12:00:00"), "dd/MM"),
            },
            {
              key: "material",
              label: "Material",
              render: (e) => e.material.name,
            },
            {
              key: "invoiceNumber",
              label: "Nota",
              render: (e) => e.invoiceNumber || "—",
            },
            {
              key: "fiberType",
              label: "Tipo fio",
              className: "hidden sm:table-cell",
              render: (e) => e.fiberType || "—",
            },
            {
              key: "boxes",
              label: "Caixas",
              className: "hidden lg:table-cell",
              render: (e) => e.boxes ? fmt(Number(e.boxes)) : "—",
            },
            {
              key: "kgPerBox",
              label: "Kg/cx",
              className: "hidden lg:table-cell",
              render: (e) => e.kgPerBox ? fmt(Number(e.kgPerBox)) : "—",
            },
            {
              key: "weightKg",
              label: "Peso (kg)",
              render: (e) => fmt(Number(e.weightKg)),
            },
            {
              key: "invoiceValue",
              label: "Valor nota",
              className: "hidden sm:table-cell",
              render: (e) => e.invoiceValue ? fmtBrl(Number(e.invoiceValue)) : "—",
            },
            {
              key: "taxPercent",
              label: "% Imp.",
              className: "hidden lg:table-cell",
              render: (e) => e.taxPercent ? `${Number(e.taxPercent)}%` : "—",
            },
            {
              key: "unitValue",
              label: "Val. unit.",
              className: "hidden lg:table-cell",
              render: (e) => e.unitValue ? fmtBrl(Number(e.unitValue)) : "—",
            },
            {
              key: "totalValue",
              label: "Valor total",
              render: (e) => e.totalValue ? fmtBrl(Number(e.totalValue)) : "—",
            },
            {
              key: "paymentMethod",
              label: "Pagamento",
              className: "hidden lg:table-cell",
              render: (e) => {
                const parts = [];
                if (e.paymentMethod) parts.push(e.paymentMethod);
                if (e.paymentDate) parts.push(format(new Date(e.paymentDate + "T12:00:00"), "dd/MM"));
                return parts.length > 0 ? parts.join(" · ") : "—";
              },
            },
            {
              key: "notes",
              label: "Obs",
              className: "hidden xl:table-cell",
              render: (e) => e.notes || "—",
            },
          ]}
        />
      </div>

      {/* Add entry modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nova entrada de material">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Material" required>
              <select name="materialId" required className={inputClass}>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Data" required>
              <input name="date" type="date" required className={inputClass} defaultValue={format(new Date(), "yyyy-MM-dd")} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nº Nota fiscal">
              <input name="invoiceNumber" className={inputClass} />
            </FormField>
            <FormField label="Tipo de fio">
              <input name="fiberType" className={inputClass} placeholder="Ex: Algodão, 150/48" />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Caixas">
              <input name="boxes" type="number" step="0.01" className={inputClass} />
            </FormField>
            <FormField label="Kg/Caixa">
              <input name="kgPerBox" type="number" step="0.01" className={inputClass} />
            </FormField>
            <FormField label="Peso (kg)" required>
              <input name="weightKg" type="number" step="0.01" required className={inputClass} placeholder="0.00" />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Valor nota">
              <input name="invoiceValue" type="number" step="0.01" className={inputClass} />
            </FormField>
            <FormField label="% Imposto">
              <input name="taxPercent" type="number" step="0.01" className={inputClass} />
            </FormField>
            <FormField label="Valor imposto">
              <input name="taxValue" type="number" step="0.01" className={inputClass} />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Valor unitário">
              <input name="unitValue" type="number" step="0.0001" className={inputClass} />
            </FormField>
            <FormField label="Valor total">
              <input name="totalValue" type="number" step="0.01" className={inputClass} />
            </FormField>
            <FormField label="Data pagamento">
              <input name="paymentDate" type="date" className={inputClass} />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Forma pagamento">
              <select name="paymentMethod" className={inputClass}>
                <option value="">—</option>
                <option value="Pix">Pix</option>
                <option value="Boleto">Boleto</option>
                <option value="Transferência">Transferência</option>
                <option value="Cheque">Cheque</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </FormField>
            <FormField label="Pago por">
              <input name="paidBy" className={inputClass} />
            </FormField>
            <FormField label="Observações">
              <input name="notes" className={inputClass} />
            </FormField>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className={btnSecondary}>Cancelar</button>
            <button type="submit" className={btnPrimary}>Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
