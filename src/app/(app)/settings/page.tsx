"use client";

import { useFactory } from "@/lib/factory-context";
import { useEffect, useState, useTransition } from "react";
import { getDashboardData } from "@/lib/actions/dashboard";
import { getExpenses } from "@/lib/actions/expenses";
import { getMaterialEntries } from "@/lib/actions/materials";
import { getCurrentMonth, formatMonth } from "@/lib/months";
import { MonthSelector } from "@/components/ui/month-selector";
import { Users, Calculator } from "lucide-react";

export default function SettingsPage() {
  const { current } = useFactory();
  const [month, setMonth] = useState(getCurrentMonth());
  const [data, setData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [materialEntries, setMaterialEntries] = useState<any[]>([]);
  const [pending, startTransition] = useTransition();

  const partners = (current?.config as any)?.partners as string[] | undefined;

  useEffect(() => {
    if (!current) return;
    startTransition(async () => {
      const [d, e, m] = await Promise.all([
        getDashboardData(current.id, month),
        getExpenses(current.id, month),
        getMaterialEntries(current.id, month),
      ]);
      setData(d);
      setExpenses(e);
      setMaterialEntries(m);
    });
  }, [current, month]);

  if (!current) return null;

  const fmtBrl = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Acerto entre sócios
  const partnerExpenses: Record<string, number> = {};
  if (partners) {
    for (const p of partners) partnerExpenses[p] = 0;
    for (const e of expenses) {
      if (e.paidBy && partnerExpenses[e.paidBy] !== undefined) {
        partnerExpenses[e.paidBy] += Number(e.value);
      }
    }
    for (const m of materialEntries) {
      if (m.paidBy && partnerExpenses[m.paidBy] !== undefined) {
        partnerExpenses[m.paidBy] += Number(m.totalValue || 0);
      }
    }
  }

  const totalPaid = Object.values(partnerExpenses).reduce((s, v) => s + v, 0);
  const fairShare = partners ? totalPaid / partners.length : 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted mt-1">{current.name}</p>
        </div>
        <MonthSelector value={month} onChange={setMonth} />
      </div>

      {/* Factory info */}
      <div className="bg-surface-2 border border-border rounded-lg p-6 mb-6">
        <h2 className="font-bold text-sm mb-4">Informações da fábrica</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted mb-1">Nome</div>
            <div className="font-medium">{current.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Tipo</div>
            <div className="font-medium">{current.type}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Código</div>
            <div className="font-medium">{current.code}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Organização</div>
            <div className="font-medium">{current.organizationName}</div>
          </div>
        </div>
      </div>

      {/* Acerto entre sócios */}
      {partners && partners.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-brand" />
            <h2 className="font-bold text-sm">Acerto entre sócios</h2>
            <span className="text-xs text-muted capitalize">· {formatMonth(month)}</span>
          </div>

          {data ? (
            <>
              <div className="space-y-3 mb-6">
                {partners.map((p) => {
                  const paid = partnerExpenses[p] || 0;
                  const diff = paid - fairShare;
                  return (
                    <div
                      key={p}
                      className="flex items-center justify-between py-3 px-4 bg-surface rounded-lg border border-border/50"
                    >
                      <div>
                        <div className="font-medium text-sm">{p}</div>
                        <div className="text-xs text-muted">
                          Pagou: {fmtBrl(paid)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${
                            diff > 0
                              ? "text-success"
                              : diff < 0
                                ? "text-danger"
                                : "text-muted"
                          }`}
                        >
                          {diff > 0 ? "+" : ""}
                          {fmtBrl(diff)}
                        </div>
                        <div className="text-xs text-muted">
                          {diff > 0 ? "a receber" : diff < 0 ? "a pagar" : "em dia"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 py-3 px-4 bg-brand/5 border border-brand/20 rounded-lg">
                <Calculator size={14} className="text-brand" />
                <div className="text-xs">
                  <span className="text-muted">Total do mês: </span>
                  <span className="font-bold">{fmtBrl(totalPaid)}</span>
                  <span className="text-muted"> · Parte justa: </span>
                  <span className="font-bold">{fmtBrl(fairShare)}</span>
                  <span className="text-muted"> cada</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted text-sm">Carregando...</div>
          )}
        </div>
      )}
    </div>
  );
}
