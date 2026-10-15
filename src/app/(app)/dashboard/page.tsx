"use client";

import { useFactory } from "@/lib/factory-context";
import { useEffect, useState, useTransition } from "react";
import { getDashboardData } from "@/lib/actions/dashboard";
import { getCurrentMonth } from "@/lib/months";
import { MonthSelector } from "@/components/ui/month-selector";
import {
  Package,
  Boxes,
  TrendingDown,
  Scale,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

type DashData = Awaited<ReturnType<typeof getDashboardData>>;

function KpiCard({
  label,
  value,
  unit,
  detail,
  icon: Icon,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  icon: React.ElementType;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`p-5 rounded-lg border transition-colors ${
        highlight
          ? "border-brand/30 bg-brand/5"
          : danger
            ? "border-danger/30 bg-danger/5"
            : "border-border bg-surface-2"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted">{label}</span>
        <Icon
          size={16}
          className={highlight ? "text-brand" : danger ? "text-danger" : "text-muted"}
        />
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`text-2xl font-bold tracking-tight ${
            highlight ? "text-brand" : danger ? "text-danger" : "text-text"
          }`}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {detail && <p className="text-xs text-muted mt-1.5">{detail}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { current } = useFactory();
  const [month, setMonth] = useState(getCurrentMonth());
  const [data, setData] = useState<DashData | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!current) return;
    startTransition(async () => setData(await getDashboardData(current.id, month)));
  }, [current, month]);

  if (!current) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Nenhuma fábrica disponível</h2>
          <p className="text-muted text-sm">Peça ao administrador para dar acesso a uma fábrica.</p>
        </div>
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const fmtBrl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted mt-1">{current.name} · {current.type}</p>
        </div>
        <MonthSelector value={month} onChange={setMonth} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Produção do mês"
          value={data ? fmt(data.production.totalKg) : "—"}
          unit="kg"
          detail={data ? `${data.production.count} lançamentos` : "Carregando..."}
          icon={Package}
          highlight
        />
        <KpiCard
          label="Entrada de fio"
          value={data ? fmt(data.materialEntries.totalKg) : "—"}
          unit="kg"
          detail={data ? fmtBrl(data.materialEntries.totalValue) : "Carregando..."}
          icon={Boxes}
        />
        <KpiCard
          label="Índice de perdas"
          value={data ? fmt(data.losses.index) : "—"}
          unit="%"
          detail={data ? `${fmt(data.losses.totalKg)} kg perdidos` : "Carregando..."}
          icon={TrendingDown}
          danger={data ? data.losses.index > 5 : false}
        />
        <KpiCard
          label="Última pesagem"
          value={data?.lastWeighing ? fmt(data.lastWeighing.weightKg) : "—"}
          unit={data?.lastWeighing ? "kg" : undefined}
          detail={data?.lastWeighing ? format(new Date(data.lastWeighing.date + "T12:00:00"), "dd/MM/yyyy") : "Sem pesagem"}
          icon={Scale}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Lançar produção", desc: "Registrar novo rolo", href: "/production" },
          { label: "Registrar pesagem", desc: "Conferir estoque", href: "/weighing" },
          { label: "Ver relatórios", desc: "Filtros e exportação", href: "/reports" },
        ].map(({ label, desc, href }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center justify-between p-4 bg-surface-2 border border-border rounded-lg hover:border-brand/40 transition-colors text-left group"
          >
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted">{desc}</div>
            </div>
            <ArrowUpRight size={16} className="text-muted group-hover:text-brand transition-colors" />
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-lg p-6 bg-surface-2">
          <h2 className="font-bold text-sm mb-4">Produção por dia</h2>
          {data && data.dailyProduction.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.dailyProduction}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(new Date(d + "T12:00:00"), "dd")}
                  stroke="var(--color-muted)"
                  fontSize={11}
                />
                <YAxis stroke="var(--color-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border-2)",
                    borderRadius: "8px",
                    color: "var(--color-text)",
                    fontSize: "12px",
                  }}
                  formatter={(v) => [`${fmt(Number(v))} kg`, "Produção"]}
                  labelFormatter={(d) => format(new Date(d + "T12:00:00"), "dd/MM")}
                />
                <Bar dataKey="kg" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted text-sm">
              {data ? "Nenhum dado de produção no mês" : "Carregando..."}
            </div>
          )}
        </div>

        <div className="border border-border rounded-lg p-6 bg-surface-2">
          <h2 className="font-bold text-sm mb-4">Resumo financeiro</h2>
          {data ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted">Entrada de fio</span>
                <span className="text-sm font-medium">{fmtBrl(data.materialEntries.totalValue)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted">Despesas operacionais</span>
                <span className="text-sm font-medium">{fmtBrl(data.expenses.total)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted">Total de custos</span>
                <span className="text-sm font-bold text-danger">
                  {fmtBrl(data.materialEntries.totalValue + data.expenses.total)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted">Produção total</span>
                <span className="text-sm font-bold text-brand">{fmt(data.production.totalKg)} kg</span>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted text-sm">Carregando...</div>
          )}
        </div>
      </div>
    </div>
  );
}
