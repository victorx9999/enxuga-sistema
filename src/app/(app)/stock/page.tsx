"use client";

import { useFactory } from "@/lib/factory-context";
import { useEffect, useState, useTransition } from "react";
import { getMaterials, createMaterial } from "@/lib/actions/materials";
import { getStockBalance, getConsumptionsByMonth } from "@/lib/actions/stock";
import { getCurrentMonth } from "@/lib/months";
import { MonthSelector } from "@/components/ui/month-selector";
import { Modal, FormField, inputClass, btnPrimary, btnSecondary } from "@/components/ui/modal";
import { Boxes } from "lucide-react";

type Material = Awaited<ReturnType<typeof getMaterials>>[number];
type Balance = Awaited<ReturnType<typeof getStockBalance>>[number];
type Consumption = Awaited<ReturnType<typeof getConsumptionsByMonth>>[number];

export default function StockPage() {
  const { current } = useFactory();
  const [month, setMonth] = useState(getCurrentMonth());
  const [balances, setBalances] = useState<Balance[]>([]);
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showConsumptions, setShowConsumptions] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!current) return;
    startTransition(async () => {
      const [b, c] = await Promise.all([
        getStockBalance(current.id, month),
        getConsumptionsByMonth(current.id, month),
      ]);
      setBalances(b);
      setConsumptions(c);
    });
  }, [current, month]);

  function reload() {
    if (!current) return;
    startTransition(async () => {
      const [b, c] = await Promise.all([
        getStockBalance(current.id, month),
        getConsumptionsByMonth(current.id, month),
      ]);
      setBalances(b);
      setConsumptions(c);
    });
  }

  async function handleAddMaterial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const fd = new FormData(e.currentTarget);
    await createMaterial(current.id, { name: fd.get("name") as string });
    setShowAddMaterial(false);
    reload();
  }

  if (!current) return null;

  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const fmtBrl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalClosing = balances.reduce((s, b) => s + b.closingKg, 0);
  const totalEntries = balances.reduce((s, b) => s + b.entriesKg, 0);
  const totalConsumed = balances.reduce((s, b) => s + b.consumptionKg, 0);
  const totalValue = balances.reduce((s, b) => s + b.closingKg * b.avgPrice, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          <p className="text-sm text-muted mt-1">Saldo de materiais · Fechamento mensal</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthSelector value={month} onChange={setMonth} />
          <button onClick={() => setShowAddMaterial(true)} className={btnSecondary}>
            <span className="flex items-center gap-1.5"><Boxes size={14} /> Material</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Entradas no mês</div>
          <div className="text-xl font-bold">{fmt(totalEntries)} <span className="text-xs text-muted">kg</span></div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Consumo no mês</div>
          <div className="text-xl font-bold text-danger">{fmt(totalConsumed)} <span className="text-xs text-muted">kg</span></div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Saldo atual</div>
          <div className={`text-xl font-bold ${totalClosing < 0 ? "text-danger" : "text-brand"}`}>
            {fmt(totalClosing)} <span className="text-xs text-muted">kg</span>
          </div>
        </div>
        <div className="p-4 bg-surface-2 border border-border rounded-lg">
          <div className="text-xs text-muted mb-1">Valor do estoque</div>
          <div className="text-xl font-bold">{fmtBrl(totalValue)}</div>
        </div>
      </div>

      {/* Balance table */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-muted font-medium">Material</th>
              <th className="text-right px-4 py-3 text-xs text-muted font-medium">Abertura</th>
              <th className="text-right px-4 py-3 text-xs text-muted font-medium">+ Entradas</th>
              <th className="text-right px-4 py-3 text-xs text-muted font-medium">- Consumo</th>
              <th className="text-right px-4 py-3 text-xs text-muted font-medium">= Fechamento</th>
              <th className="text-right px-4 py-3 text-xs text-muted font-medium hidden sm:table-cell">Preço médio</th>
              <th className="text-right px-4 py-3 text-xs text-muted font-medium hidden sm:table-cell">Valor estoque</th>
            </tr>
          </thead>
          <tbody>
            {balances.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Nenhum material cadastrado.
                </td>
              </tr>
            ) : (
              balances.map((b) => (
                <tr key={b.materialId} className="border-b border-border/50 hover:bg-surface-3/50">
                  <td className="px-4 py-3 font-medium">{b.materialName}</td>
                  <td className="px-4 py-3 text-right text-muted">{fmt(b.openingKg)}</td>
                  <td className="px-4 py-3 text-right text-green-400">+{fmt(b.entriesKg)}</td>
                  <td className="px-4 py-3 text-right text-danger">
                    {b.consumptionKg > 0 ? `-${fmt(b.consumptionKg)}` : "0"}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${b.closingKg < 0 ? "text-danger" : ""}`}>
                    {fmt(b.closingKg)} kg
                  </td>
                  <td className="px-4 py-3 text-right text-muted hidden sm:table-cell">
                    {b.avgPrice > 0 ? fmtBrl(b.avgPrice) + "/kg" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    {b.avgPrice > 0 ? fmtBrl(b.closingKg * b.avgPrice) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {balances.length > 0 && (
            <tfoot>
              <tr className="border-t border-border font-bold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right text-muted">
                  {fmt(balances.reduce((s, b) => s + b.openingKg, 0))}
                </td>
                <td className="px-4 py-3 text-right text-green-400">
                  +{fmt(totalEntries)}
                </td>
                <td className="px-4 py-3 text-right text-danger">
                  -{fmt(totalConsumed)}
                </td>
                <td className="px-4 py-3 text-right">{fmt(totalClosing)} kg</td>
                <td className="px-4 py-3 text-right hidden sm:table-cell">—</td>
                <td className="px-4 py-3 text-right hidden sm:table-cell">{fmtBrl(totalValue)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Consumptions detail */}
      {consumptions.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold">Consumo detalhado</h2>
            <button
              onClick={() => setShowConsumptions(!showConsumptions)}
              className="text-xs text-brand hover:underline"
            >
              {showConsumptions ? "Esconder" : `Ver ${consumptions.length} registros`}
            </button>
          </div>
          {showConsumptions && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs text-muted font-medium">Produto</th>
                  <th className="text-left px-4 py-2 text-xs text-muted font-medium">Material consumido</th>
                  <th className="text-right px-4 py-2 text-xs text-muted font-medium">Peso (kg)</th>
                </tr>
              </thead>
              <tbody>
                {consumptions.map((c) => (
                  <tr key={c.id} className="border-b border-border/30">
                    <td className="px-4 py-2">{c.productionEntry.product.name}</td>
                    <td className="px-4 py-2 text-muted">{c.material.name}</td>
                    <td className="px-4 py-2 text-right">{fmt(Number(c.weightKg))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add material modal */}
      <Modal open={showAddMaterial} onClose={() => setShowAddMaterial(false)} title="Novo material">
        <form onSubmit={handleAddMaterial} className="space-y-4">
          <FormField label="Nome" required>
            <input name="name" required className={inputClass} placeholder="Ex: Fio Algodão" />
          </FormField>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowAddMaterial(false)} className={btnSecondary}>Cancelar</button>
            <button type="submit" className={btnPrimary}>Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
