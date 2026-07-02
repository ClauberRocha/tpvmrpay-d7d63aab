import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  dimensionRanking,
  formatBRL,
  formatNumber,
  monthlySeries,
  totalsFiltered,
  tpv,
  type Filtros,
} from "@/data/tpv";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const YELLOW: [number, number, number] = [249, 199, 48];
const DARK: [number, number, number] = [24, 24, 27];
const MUTED: [number, number, number] = [110, 110, 120];

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

function periodoLabel(f: Filtros): string {
  const mesesLbl = f.meses.length ? f.meses.map((m) => MESES[m - 1]).join(", ") : "Todos os meses";
  const anoLbl = f.ano === "todos" ? "Histórico completo" : `Ano ${f.ano}`;
  return `${anoLbl} · ${mesesLbl}`;
}

export function exportDashboardPdf(filtros: Filtros) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 80, "F");
  doc.setFillColor(...YELLOW);
  doc.rect(0, 80, pageW, 4, "F");

  doc.setTextColor(...YELLOW);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MR Pay · TPV", margin, 40);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Relatório Executivo do Dashboard", margin, 60);

  const geradoEm = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  doc.setFontSize(9);
  doc.text(`Gerado em ${geradoEm}`, pageW - margin, 60, { align: "right" });

  // Filtros aplicados
  let y = 110;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Período e filtros", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Período: ${periodoLabel(filtros)}`, margin, y);
  y += 14;
  doc.text(`Segmento: ${filtros.segmento === "todos" ? "Todos" : filtros.segmento}`, margin, y);
  y += 14;
  doc.text(`UF: ${filtros.uf === "todos" ? "Todas" : filtros.uf}`, margin, y);
  y += 20;

  // KPIs
  const { tpv: tpvAtual, tx: txAtual } = totalsFiltered(filtros);
  const clientes = dimensionRanking(tpv.clienteTs, filtros).length;
  const ticket = txAtual > 0 ? tpvAtual / txAtual : 0;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Principais KPIs", margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Indicador", "Valor"]],
    body: [
      ["TPV total", formatBRL(tpvAtual)],
      ["Total de transações", formatNumber(txAtual)],
      ["Ticket médio", formatBRL(ticket)],
      ["Clientes ativos", formatNumber(clientes)],
    ],
    theme: "grid",
    headStyles: { fillColor: YELLOW, textColor: DARK, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    margin: { left: margin, right: margin },
  });

  y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 24;

  // Tendência mensal
  const serie = monthlySeries(filtros);
  if (serie.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text("Tendência mensal (TPV)", margin, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [["Período", "TPV"]],
      body: serie.map((r) => [`${MESES[r.mes - 1]}/${r.ano}`, formatBRL(r.tpv)]),
      theme: "striped",
      headStyles: { fillColor: DARK, textColor: YELLOW, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: margin, right: margin },
    });
    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 24;
  }

  // Top segmentos
  const topSeg = dimensionRanking(tpv.segmentoTs, { ...filtros, segmento: "todos" }).slice(0, 10);
  if (topSeg.length) {
    if (y > 680) { doc.addPage(); y = 60; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text("Top segmentos", margin, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [["Segmento", "TPV", "Transações"]],
      body: topSeg.map((r) => [r.name, formatBRL(r.tpv), formatNumber(r.tx)]),
      theme: "striped",
      headStyles: { fillColor: DARK, textColor: YELLOW, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: margin, right: margin },
    });
    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 24;
  }

  // Top clientes
  const topCli = dimensionRanking(tpv.clienteTs, filtros).slice(0, 15);
  if (topCli.length) {
    if (y > 620) { doc.addPage(); y = 60; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text("Top 15 clientes", margin, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [["#", "Cliente", "TPV", "Transações"]],
      body: topCli.map((r, i) => [String(i + 1), r.name, formatBRL(r.tpv), formatNumber(r.tx)]),
      theme: "striped",
      headStyles: { fillColor: DARK, textColor: YELLOW, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: margin, right: margin },
    });
    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 24;
  }

  // Top UFs
  const topUf = dimensionRanking(tpv.ufTs, { ...filtros, uf: "todos" }).slice(0, 15);
  if (topUf.length) {
    if (y > 620) { doc.addPage(); y = 60; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text("TPV por UF", margin, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [["UF", "TPV", "Transações"]],
      body: topUf.map((r) => [r.name, formatBRL(r.tpv), formatNumber(r.tx)]),
      theme: "striped",
      headStyles: { fillColor: DARK, textColor: YELLOW, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: margin, right: margin },
    });
  }

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, h - 30, pageW - margin, h - 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Mr Pagamentos · Painel TPV interno", margin, h - 15);
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin, h - 15, { align: "right" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`mrpay-tpv-${stamp}.pdf`);
}
