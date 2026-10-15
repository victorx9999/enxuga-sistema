"use client";

import { useFactory } from "@/lib/factory-context";
import { useEffect, useState, useTransition } from "react";
import { getProductionEntries } from "@/lib/actions/production";
import { getMaterialEntries } from "@/lib/actions/materials";
import { getExpenses } from "@/lib/actions/expenses";
import { getLosses } from "@/lib/actions/losses";
import { getAnnualReportData } from "@/lib/actions/annual-report";
import { getMonthlyReportData } from "@/lib/actions/monthly-report";
import { getCurrentMonth, formatMonth } from "@/lib/months";
import { MonthSelector } from "@/components/ui/month-selector";
import { DataTable } from "@/components/ui/data-table";
import { Download, FileText } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/ui/modal";
import { format } from "date-fns";

const TABS = [
  { key: "production", label: "Produção" },
  { key: "materials", label: "Entradas" },
  { key: "expenses", label: "Despesas" },
  { key: "losses", label: "Perdas" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

function getMonthLabel(month: string) {
  const m = month.split("-")[1];
  return MONTH_LABELS[m] || m;
}

export default function ReportsPage() {
  const { current } = useFactory();
  const [month, setMonth] = useState(getCurrentMonth());
  const [tab, setTab] = useState<TabKey>("production");
  const [data, setData] = useState<any[]>([]);
  const [pending, startTransition] = useTransition();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingMonthly, setGeneratingMonthly] = useState(false);

  useEffect(() => {
    if (!current) return;
    startTransition(async () => {
      switch (tab) {
        case "production":
          setData(await getProductionEntries(current.id, month));
          break;
        case "materials":
          setData(await getMaterialEntries(current.id, month));
          break;
        case "expenses":
          setData(await getExpenses(current.id, month));
          break;
        case "losses":
          setData(await getLosses(current.id, month));
          break;
      }
    });
  }, [current, month, tab]);

  function exportCSV() {
    if (data.length === 0) return;

    let csvRows: string[][] = [];

    if (tab === "production") {
      csvRows = [
        ["Data", "Produto", "Peso (kg)", "Máquina", "Tecelagem"],
        ...data.map((e: any) => [
          e.date, e.product?.name ?? "", e.weightKg, e.machine ?? "", String(e.weaving ?? ""),
        ]),
      ];
    } else if (tab === "materials") {
      csvRows = [
        ["Data", "Material", "Peso (kg)", "Nota", "Valor Total", "Pago por"],
        ...data.map((e: any) => [
          e.date, e.material?.name ?? "", e.weightKg, e.invoiceNumber ?? "", e.totalValue ?? "", e.paidBy ?? "",
        ]),
      ];
    } else if (tab === "expenses") {
      csvRows = [
        ["Data", "Descrição", "Valor", "Pago por"],
        ...data.map((e: any) => [e.date, e.description, e.value, e.paidBy ?? ""]),
      ];
    } else if (tab === "losses") {
      csvRows = [
        ["Data", "Produto", "Material", "Peso (kg)", "Motivo"],
        ...data.map((e: any) => [
          e.date, e.product?.name ?? "", e.material?.name ?? "", e.weightKg, e.reason ?? "",
        ]),
      ];
    }

    const csv = csvRows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab}_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generateAnnualPDF() {
    if (!current) return;
    setGeneratingPdf(true);

    try {
      const year = month.substring(0, 4);
      const reportData = await getAnnualReportData(current.id, year);

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const brandColor: [number, number, number] = [255, 90, 31];

      // Helper
      const fmt = (n: number | string) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
      const fmtBrl = (n: number | string) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      // --- PAGE 1: Cover ---
      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageWidth, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text("ENXUGA+ GESTÃO INDUSTRIAL", 10, 8);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(28);
      doc.text("Relatório Anual Consolidado", 10, 40);

      doc.setFontSize(16);
      doc.setTextColor(100, 100, 100);
      doc.text(`${current.name} · ${year}`, 10, 52);

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 10, 65);
      doc.text(`Tipo: ${current.type}`, 10, 72);

      // Summary box
      const totalProdKg = reportData.productionTotals.reduce((s, r) => s + Number(r.totalKg), 0);
      const totalMatKg = reportData.materialTotals.reduce((s, r) => s + Number(r.totalKg), 0);
      const totalMatValue = reportData.materialTotals.reduce((s, r) => s + Number(r.totalValue), 0);
      const totalExpenses = reportData.expensesByMonth.reduce((s, r) => s + Number(r.total), 0);
      const totalLossesKg = reportData.lossesByMonth.reduce((s, r) => s + Number(r.totalKg), 0);

      const summaryY = 90;
      const boxW = 60;
      const gap = 8;
      const summaryItems = [
        { label: "Produção total", value: `${fmt(totalProdKg)} kg` },
        { label: "Entradas de material", value: `${fmt(totalMatKg)} kg` },
        { label: "Valor das entradas", value: fmtBrl(totalMatValue) },
        { label: "Despesas operacionais", value: fmtBrl(totalExpenses) },
      ];

      summaryItems.forEach((item, i) => {
        const x = 10 + i * (boxW + gap);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(x, summaryY, boxW, 24, 2, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(item.label, x + 4, summaryY + 8);
        doc.setFontSize(14);
        doc.setTextColor(30, 30, 30);
        doc.text(item.value, x + 4, summaryY + 18);
      });

      // --- PAGE 2: Production by month ---
      doc.addPage();
      addHeader(doc, pageWidth, brandColor, "1. Produção por mês");

      const months = [...new Set(reportData.productionByMonth.map((r) => r.month))].sort();
      const prodProducts = [...new Set(reportData.productionByMonth.map((r) => r.productName))].sort();

      const prodHeaders = ["Mês", ...prodProducts, "Total"];
      const prodRows = months.map((m) => {
        const row = [getMonthLabel(m)];
        let total = 0;
        for (const p of prodProducts) {
          const entry = reportData.productionByMonth.find((r) => r.month === m && r.productName === p);
          const kg = entry ? Number(entry.totalKg) : 0;
          total += kg;
          row.push(kg > 0 ? fmt(kg) : "—");
        }
        row.push(fmt(total));
        return row;
      });

      // Totals row
      const prodTotalRow = ["TOTAL"];
      let grandTotal = 0;
      for (const p of prodProducts) {
        const t = reportData.productionTotals.find((r) => r.productName === p);
        const kg = t ? Number(t.totalKg) : 0;
        grandTotal += kg;
        prodTotalRow.push(fmt(kg));
      }
      prodTotalRow.push(fmt(grandTotal));
      if (prodRows.length > 0) {
        autoTable(doc, {
          startY: 30,
          head: [prodHeaders],
          body: prodRows,
          foot: [prodTotalRow],
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: brandColor, textColor: 255 },
          footStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [252, 252, 252] },
        });
      } else {
        doc.setFontSize(10);
        doc.setTextColor(130, 130, 130);
        doc.text("Nenhum registro de produção no ano.", 10, 40);
      }

      // --- PAGE 3: Material entries by month ---
      doc.addPage();
      addHeader(doc, pageWidth, brandColor, "2. Entradas de material por mês");

      const entryMonths = [...new Set(reportData.entriesByMonth.map((r) => r.month))].sort();
      const entryMats = [...new Set(reportData.entriesByMonth.map((r) => r.materialName))].sort();

      const entryHeaders = ["Mês", ...entryMats.flatMap((m) => [`${m} (kg)`, `${m} (R$)`]), "Total (kg)", "Total (R$)"];
      const entryRows = entryMonths.map((m) => {
        const row: string[] = [getMonthLabel(m)];
        let totalKg = 0, totalVal = 0;
        for (const mat of entryMats) {
          const entry = reportData.entriesByMonth.find((r) => r.month === m && r.materialName === mat);
          const kg = entry ? Number(entry.totalKg) : 0;
          const val = entry ? Number(entry.totalValue) : 0;
          totalKg += kg;
          totalVal += val;
          row.push(kg > 0 ? fmt(kg) : "—");
          row.push(val > 0 ? fmtBrl(val) : "—");
        }
        row.push(fmt(totalKg));
        row.push(fmtBrl(totalVal));
        return row;
      });

      if (entryRows.length > 0) {
        autoTable(doc, {
          startY: 30,
          head: [entryHeaders],
          body: entryRows,
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: brandColor, textColor: 255 },
          alternateRowStyles: { fillColor: [252, 252, 252] },
        });
      } else {
        doc.setFontSize(10);
        doc.setTextColor(130, 130, 130);
        doc.text("Nenhuma entrada de material no ano.", 10, 40);
      }

      // --- PAGE 4: Expenses by month ---
      doc.addPage();
      addHeader(doc, pageWidth, brandColor, "3. Despesas por mês");

      if (reportData.expensesByMonth.length > 0) {
        autoTable(doc, {
          startY: 30,
          head: [["Mês", "Quantidade", "Valor total"]],
          body: reportData.expensesByMonth.map((r) => [
            getMonthLabel(r.month),
            r.count,
            fmtBrl(r.total),
          ]),
          foot: [["TOTAL", reportData.expensesByMonth.reduce((s, r) => s + r.count, 0), fmtBrl(totalExpenses)]],
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: brandColor, textColor: 255 },
          footStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [252, 252, 252] },
        });
      } else {
        doc.setFontSize(10);
        doc.setTextColor(130, 130, 130);
        doc.text("Nenhuma despesa no ano.", 10, 40);
      }

      // --- PAGE 5: Losses ---
      if (reportData.lossesByMonth.length > 0) {
        doc.addPage();
        addHeader(doc, pageWidth, brandColor, "4. Perdas por mês");
        autoTable(doc, {
          startY: 30,
          head: [["Mês", "Registros", "Total (kg)"]],
          body: reportData.lossesByMonth.map((r) => [
            getMonthLabel(r.month),
            r.count,
            fmt(r.totalKg),
          ]),
          foot: [["TOTAL", reportData.lossesByMonth.reduce((s, r) => s + r.count, 0), fmt(totalLossesKg)]],
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: brandColor, textColor: 255 },
          footStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [252, 252, 252] },
        });
      }

      // --- PAGE 6: Consumption by month ---
      if (reportData.consumptionByMonth.length > 0) {
        doc.addPage();
        addHeader(doc, pageWidth, brandColor, "5. Consumo de materiais por mês");

        const consMonths = [...new Set(reportData.consumptionByMonth.map((r) => r.month))].sort();
        const consMats = [...new Set(reportData.consumptionByMonth.map((r) => r.materialName))].sort();

        const consHeaders = ["Mês", ...consMats, "Total"];
        const consRows = consMonths.map((m) => {
          const row = [getMonthLabel(m)];
          let total = 0;
          for (const mat of consMats) {
            const entry = reportData.consumptionByMonth.find((r) => r.month === m && r.materialName === mat);
            const kg = entry ? Number(entry.totalKg) : 0;
            total += kg;
            row.push(kg > 0 ? fmt(kg) : "—");
          }
          row.push(fmt(total));
          return row;
        });

        autoTable(doc, {
          startY: 30,
          head: [consHeaders],
          body: consRows,
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: brandColor, textColor: 255 },
          alternateRowStyles: { fillColor: [252, 252, 252] },
        });
      }

      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `Enxuga+ · ${current.name} · Relatório ${year} · Página ${i}/${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 5,
          { align: "center" }
        );
      }

      doc.save(`relatorio_anual_${current.slug}_${year}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Erro ao gerar PDF. Verifique o console.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function generateMonthlyPDF() {
    if (!current) return;
    setGeneratingMonthly(true);

    try {
      const data = await getMonthlyReportData(current.id, month);

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const brandColor: [number, number, number] = [255, 90, 31];

      const fmt = (n: number | string) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
      const fmtR = (n: number | string) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const fmtD = (d: string) => { const p = d.split("-"); return `${p[2]}/${p[1]}`; };

      // Cover
      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageWidth, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text("ENXUGA+ GESTÃO INDUSTRIAL", 10, 8);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(24);
      doc.text(`Relatório Mensal · ${formatMonth(month)}`, 10, 35);
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`${current.name} · Gerado em ${format(new Date(), "dd/MM/yyyy")}`, 10, 45);

      // Summary boxes
      const totalProd = data.productionByProduct.reduce((s, r) => s + Number(r.totalKg), 0);
      const totalEntries = data.materialEntries.reduce((s, r) => s + Number(r.weightKg), 0);
      const totalEntriesVal = data.materialEntries.reduce((s, r) => s + Number(r.totalValue || 0), 0);
      const totalExpenses = data.expenses.reduce((s, r) => s + Number(r.value), 0);
      const totalLosses = data.losses.reduce((s, r) => s + Number(r.weightKg), 0);
      const totalConsumption = data.consumptionByMaterial.reduce((s, r) => s + Number(r.totalKg), 0);

      const boxY = 60;
      const boxW = 55;
      const gap = 6;
      [
        { label: "Produção", value: `${fmt(totalProd)} kg` },
        { label: "Entradas", value: `${fmt(totalEntries)} kg` },
        { label: "Valor entradas", value: fmtR(totalEntriesVal) },
        { label: "Despesas", value: fmtR(totalExpenses) },
        { label: "Perdas", value: `${fmt(totalLosses)} kg` },
      ].forEach((item, i) => {
        const x = 10 + i * (boxW + gap);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(x, boxY, boxW, 22, 2, 2, "F");
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.text(item.label, x + 3, boxY + 7);
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text(item.value, x + 3, boxY + 17);
      });

      // Production details
      if (data.productionDetails.length > 0) {
        doc.addPage();
        addHeader(doc, pageWidth, brandColor, "1. Produção detalhada");
        autoTable(doc, {
          startY: 30,
          head: [["Data", "Produto", "Máquina", "Tecelagem", "Peso (kg)"]],
          body: data.productionDetails.map((r) => [
            fmtD(r.date), r.productName, r.machine || "—", r.weaving || "—", fmt(r.weightKg),
          ]),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: brandColor, textColor: 255 },
          alternateRowStyles: { fillColor: [252, 252, 252] },
        });
      }

      // Material entries
      if (data.materialEntries.length > 0) {
        doc.addPage();
        addHeader(doc, pageWidth, brandColor, "2. Entradas de material");
        autoTable(doc, {
          startY: 30,
          head: [["Data", "Material", "Nota", "Peso (kg)", "Valor unit.", "Valor total", "Imposto"]],
          body: data.materialEntries.map((r) => [
            fmtD(r.date), r.materialName, r.invoiceNumber || "—",
            fmt(r.weightKg), r.unitValue ? fmtR(r.unitValue) : "—",
            r.totalValue ? fmtR(r.totalValue) : "—", r.taxValue ? fmtR(r.taxValue) : "—",
          ]),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: brandColor, textColor: 255 },
          alternateRowStyles: { fillColor: [252, 252, 252] },
        });
      }

      // Expenses
      if (data.expenses.length > 0) {
        doc.addPage();
        addHeader(doc, pageWidth, brandColor, "3. Despesas");
        autoTable(doc, {
          startY: 30,
          head: [["Data", "Descrição", "Valor", "Pago por"]],
          body: data.expenses.map((r) => [
            fmtD(r.date), r.description, fmtR(r.value), r.paidBy || "—",
          ]),
          foot: [["", "TOTAL", fmtR(totalExpenses), ""]],
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: brandColor, textColor: 255 },
          footStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [252, 252, 252] },
        });
      }

      // Losses
      if (data.losses.length > 0) {
        doc.addPage();
        addHeader(doc, pageWidth, brandColor, "4. Perdas");
        autoTable(doc, {
          startY: 30,
          head: [["Data", "Produto", "Material", "Peso (kg)", "Motivo"]],
          body: data.losses.map((r) => [
            fmtD(r.date), r.productName || "—", r.materialName || "—", fmt(r.weightKg), r.reason || "—",
          ]),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: brandColor, textColor: 255 },
          alternateRowStyles: { fillColor: [252, 252, 252] },
        });
      }

      // Consumption
      if (data.consumptionByMaterial.length > 0) {
        doc.addPage();
        addHeader(doc, pageWidth, brandColor, "5. Consumo de materiais");
        autoTable(doc, {
          startY: 30,
          head: [["Material", "Total consumido (kg)"]],
          body: data.consumptionByMaterial.map((r) => [r.materialName, fmt(r.totalKg)]),
          foot: [["TOTAL", fmt(totalConsumption)]],
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: brandColor, textColor: 255 },
          footStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [252, 252, 252] },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `Enxuga+ · ${current.name} · ${formatMonth(month)} · Página ${i}/${pageCount}`,
          pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" }
        );
      }

      doc.save(`relatorio_${month}_${current.slug}.pdf`);
    } catch (err) {
      console.error("Monthly PDF failed:", err);
      alert("Erro ao gerar PDF mensal.");
    } finally {
      setGeneratingMonthly(false);
    }
  }

  if (!current) return null;

  const fmtDate = (d: string) => format(new Date(d + "T12:00:00"), "dd/MM");
  const fmtNum = (n: string | number) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const fmtBrl = (n: string | number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const columns: Record<TabKey, any[]> = {
    production: [
      { key: "date", label: "Data", render: (e: any) => fmtDate(e.date) },
      { key: "product", label: "Produto", render: (e: any) => e.product?.name ?? "—" },
      { key: "weightKg", label: "Peso (kg)", render: (e: any) => fmtNum(e.weightKg) },
      { key: "machine", label: "Máquina", className: "hidden sm:table-cell" },
    ],
    materials: [
      { key: "date", label: "Data", render: (e: any) => fmtDate(e.date) },
      { key: "material", label: "Material", render: (e: any) => e.material?.name ?? "—" },
      { key: "weightKg", label: "Peso (kg)", render: (e: any) => fmtNum(e.weightKg) },
      { key: "totalValue", label: "Valor", className: "hidden sm:table-cell", render: (e: any) => e.totalValue ? fmtBrl(e.totalValue) : "—" },
    ],
    expenses: [
      { key: "date", label: "Data", render: (e: any) => fmtDate(e.date) },
      { key: "description", label: "Descrição" },
      { key: "value", label: "Valor", render: (e: any) => fmtBrl(e.value) },
      { key: "paidBy", label: "Pago por", className: "hidden sm:table-cell" },
    ],
    losses: [
      { key: "date", label: "Data", render: (e: any) => fmtDate(e.date) },
      { key: "product", label: "Produto", render: (e: any) => e.product?.name ?? "—" },
      { key: "weightKg", label: "Peso (kg)", render: (e: any) => fmtNum(e.weightKg) },
      { key: "reason", label: "Motivo", className: "hidden sm:table-cell" },
    ],
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted mt-1">Consulta e exportação de dados</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <MonthSelector value={month} onChange={setMonth} />
          <button onClick={exportCSV} disabled={data.length === 0} className={btnSecondary}>
            <span className="flex items-center gap-1.5"><Download size={14} /> CSV</span>
          </button>
          <button
            onClick={generateMonthlyPDF}
            disabled={generatingMonthly}
            className={btnSecondary}
          >
            <span className="flex items-center gap-1.5">
              <FileText size={14} />
              {generatingMonthly ? "Gerando..." : "PDF Mensal"}
            </span>
          </button>
          <button
            onClick={generateAnnualPDF}
            disabled={generatingPdf}
            className={btnPrimary}
          >
            <span className="flex items-center gap-1.5">
              <FileText size={14} />
              {generatingPdf ? "Gerando..." : `PDF ${month.substring(0, 4)}`}
            </span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              tab === t.key
                ? "bg-brand text-surface"
                : "bg-surface-2 text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <DataTable
          data={data}
          columns={columns[tab]}
          emptyMessage={`Nenhum registro de ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} no mês.`}
        />
      </div>

      {data.length > 0 && (
        <div className="mt-4 text-xs text-muted text-right">
          {data.length} registro{data.length !== 1 ? "s" : ""} · {formatMonth(month)}
        </div>
      )}
    </div>
  );
}

function addHeader(
  doc: any,
  pageWidth: number,
  brandColor: [number, number, number],
  title: string
) {
  doc.setFillColor(...brandColor);
  doc.rect(0, 0, pageWidth, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("ENXUGA+ GESTÃO INDUSTRIAL", 10, 8);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.text(title, 10, 24);
}
