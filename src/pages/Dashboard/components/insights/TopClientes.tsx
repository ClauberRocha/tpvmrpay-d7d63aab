import { Download } from "lucide-react";

import { useDashboard } from "../../hooks/useDashboard";

import { formatBRL, formatNumber } from "@/data/tpv";
import type { CategoriaCliente, Filtros } from "@/data/tpv";
import { exportToCsv } from "@/utils/exportCsv";

const MESES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const CATEGORIA_STYLES: Record<CategoriaCliente, string> = {
  Diamante: "bg-chart-cyan/15 text-chart-cyan border-chart-cyan/40",
  Ouro: "bg-chart-orange/15 text-chart-orange border-chart-orange/40",
  Prata: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/40",
  Bronze: "bg-chart-magenta/15 text-chart-magenta border-chart-magenta/40",
  "TPV Zerado": "bg-muted/40 text-muted-foreground border-border/60",
};

const STATUS_STYLES = {
  Ativo: "bg-success/15 text-success border-success/30",
  Alerta: "bg-chart-orange/15 text-chart-orange border-chart-orange/30",
  "Em risco": "bg-destructive/15 text-destructive border-destructive/30",
};

export function TopClientes({ filtros }: { filtros: Filtros }) {
  const { topClientes: items } = useDashboard();

  const handleExport = () => {
    const csvData = items.map((c, idx) => [
      idx + 1,
      c.name,
      c.categoria ?? "N/A",
      c.tpv,
      c.pedidos,
      c.ticket,
      c.ultimaCompra,
      c.growth.toFixed(1) + "%",
      c.inadimplencia.toFixed(1) + "%",
      c.ltv,
      c.status,
    ]);
    exportToCsv(csvData, "top_clientes_executivo.csv", [
      "Posicao",
      "Cliente",
      "Categoria",
      "TPV_Reais",
      "Pedidos",
      "Ticket_Medio_Reais",
      "Ultima_Compra",
      "Crescimento_YoY",
      "Inadimplencia",
      "LTV_Estimado",
      "Status",
    ]);
  };

  const max = items[0]?.tpv ?? 1;
  const totalTop = items.reduce((s, c) => s + c.tpv, 0);
  const lider = items[0];
  const liderPct = lider && totalTop > 0 ? (lider.tpv / totalTop) * 100 : 0;
  const periodoTxt = filtros.meses.length > 0
    ? filtros.meses.map((m) => MESES_LBL[m - 1]).join(", ")
    : "todo o período";
  const analise = lider
    ? `Ranking dos 10 maiores clientes em ${periodoTxt}. ${lider.name} lidera com ${formatBRL(lider.tpv)} (${liderPct.toFixed(1)}% do top 10).`
    : "Nenhum cliente com TPV no período selecionado.";

  return (
    <div className="panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Top 10 Clientes de Alta Performance</h3>
          <p className="text-xs text-muted-foreground">Ranking de TPV, LTV, Ticket Médio e Status de Carteira · {periodoTxt}</p>
        </div>
        <button
          onClick={handleExport}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors inline-flex items-center gap-1.5 text-xs font-medium border border-border/60 bg-muted/20 px-2.5 py-1"
          title="Exportar Excel"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Exportar Completo</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium w-12">#</th>
              <th className="px-4 py-3 text-left font-medium">Cliente</th>
              <th className="px-4 py-3 text-right font-medium">TPV</th>
              <th className="px-4 py-3 text-right font-medium">Pedidos</th>
              <th className="px-4 py-3 text-right font-medium">Ticket Médio</th>
              <th className="px-4 py-3 text-right font-medium">LTV</th>
              <th className="px-4 py-3 text-center font-medium">YoY Growth</th>
              <th className="px-4 py-3 text-center font-medium">Inadimp.</th>
              <th className="px-4 py-3 text-center font-medium">Última Compra</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c, i) => (
              <tr key={c.name} className="border-t border-border/60 transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground align-middle">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex flex-col gap-1 min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate max-w-[180px]" title={c.name}>
                        {c.name}
                      </span>
                      {c.categoria && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${CATEGORIA_STYLES[c.categoria]}`}>
                          {c.categoria}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 w-full max-w-[200px] rounded-full bg-border/40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-chart-orange"
                        style={{ width: `${(c.tpv / max) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right num-display font-semibold text-foreground whitespace-nowrap align-middle">
                  {formatBRL(c.tpv)}
                </td>
                <td className="px-4 py-3 text-right num-display text-muted-foreground whitespace-nowrap align-middle">
                  {formatNumber(c.pedidos)}
                </td>
                <td className="px-4 py-3 text-right num-display text-muted-foreground whitespace-nowrap align-middle">
                  {formatBRL(c.ticket)}
                </td>
                <td className="px-4 py-3 text-right num-display text-[#F9C730] font-semibold whitespace-nowrap align-middle">
                  {formatBRL(c.ltv)}
                </td>
                <td className={`px-4 py-3 text-center num-display font-semibold whitespace-nowrap align-middle ${
                  c.growth >= 0 ? "text-success" : "text-destructive"
                }`}>
                  {c.growth >= 0 ? "+" : ""}{c.growth.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-center num-display whitespace-nowrap align-middle">
                  {c.inadimplencia > 0 ? (
                    <span className="text-destructive font-semibold">{c.inadimplencia.toFixed(1)}%</span>
                  ) : (
                    <span className="text-muted-foreground">0.0%</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-xs text-muted-foreground whitespace-nowrap align-middle">
                  {c.ultimaCompra}
                </td>
                <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[c.status]}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-white">
        <span className="font-semibold text-white">Análise: </span>{analise}
      </p>
    </div>
  );
}
