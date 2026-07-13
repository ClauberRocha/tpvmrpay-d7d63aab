import { ArrowDown, ArrowUp, ArrowUpDown, FileSpreadsheet } from "lucide-react";
import { useMemo, useState } from "react";

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

type SortKey = "name" | "tpv" | "pedidos" | "ticket" | "growth";
type SortDir = "asc" | "desc";

const COLUMNS: {
  key: SortKey | "index";
  label: string;
  align: "left" | "right" | "center";
  width: string;
  sortable: boolean;
  defaultDir?: SortDir;
}[] = [
  { key: "index", label: "#", align: "left", width: "w-12", sortable: false },
  { key: "name", label: "Cliente", align: "left", width: "w-[32%]", sortable: true, defaultDir: "asc" },
  { key: "tpv", label: "TPV", align: "right", width: "w-[16%]", sortable: true, defaultDir: "desc" },
  { key: "pedidos", label: "Pedidos", align: "right", width: "w-[12%]", sortable: true, defaultDir: "desc" },
  { key: "ticket", label: "Ticket Médio", align: "right", width: "w-[16%]", sortable: true, defaultDir: "desc" },
  { key: "growth", label: "Cresc. ano a ano", align: "center", width: "w-[16%]", sortable: true, defaultDir: "desc" },
];

const ALIGN_CLASSES = { left: "text-left", right: "text-right", center: "text-center" } as const;
const JUSTIFY_CLASSES = { left: "justify-start", right: "justify-end", center: "justify-center" } as const;

export function TopClientes({ filtros }: { filtros: Filtros }) {
  const { topClientes: items } = useDashboard();

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    const copy = [...items];
    copy.sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      const cmp = typeof av === "string" && typeof bv === "string"
        ? av.localeCompare(bv, "pt-BR")
        : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  const toggleSort = (key: SortKey, defaultDir: SortDir) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir(defaultDir);
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  const handleExport = () => {
    const csvData = sortedItems.map((c, idx) => [
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
      "Cresc_ano_a_ano",
      "Inadimplencia",
      "LTV_Estimado",
      "Status",
    ]);
  };

  const max = Math.max(1, ...items.map((c) => c.tpv));
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
          <p className="text-xs text-muted-foreground">Ranking de TPV, Pedidos, Ticket Médio e Crescimento · {periodoTxt}</p>
        </div>
        <button
          onClick={handleExport}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors inline-flex items-center gap-1.5 text-xs font-medium border border-border/60 bg-muted/20 px-2.5 py-1"
          title="Exportar para Excel"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Exportar Excel</span>
        </button>

      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full table-fixed text-sm min-w-[720px]">
          <thead>
            <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              {COLUMNS.map((col) => {
                const isActive = col.sortable && sortKey === col.key;
                const Icon = isActive ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-medium align-middle ${ALIGN_CLASSES[col.align]} ${col.width}`}
                    aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key as SortKey, col.defaultDir ?? "desc")}
                        className={`inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground ${
                          isActive ? "text-foreground" : ""
                        } ${JUSTIFY_CLASSES[col.align]} w-full`}
                      >
                        <span>{col.label}</span>
                        <Icon className={`h-3 w-3 ${isActive ? "opacity-100" : "opacity-40"}`} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((c, i) => (
              <tr key={c.name} className="border-t border-border/60 transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground align-middle text-left">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="px-4 py-3 align-middle text-left">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-foreground truncate" title={c.name}>
                        {c.name}
                      </span>
                      {c.categoria && (
                        <span className={`inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${CATEGORIA_STYLES[c.categoria]}`}>
                          {c.categoria}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 w-full max-w-[220px] rounded-full bg-border/40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-chart-orange"
                        style={{ width: `${(c.tpv / max) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right num-display font-semibold text-foreground whitespace-nowrap align-middle tabular-nums">
                  {formatBRL(c.tpv)}
                </td>
                <td className="px-4 py-3 text-right num-display text-muted-foreground whitespace-nowrap align-middle tabular-nums">
                  {formatNumber(c.pedidos)}
                </td>
                <td className="px-4 py-3 text-right num-display text-muted-foreground whitespace-nowrap align-middle tabular-nums">
                  {formatBRL(c.ticket)}
                </td>
                <td className="px-4 py-3 text-center num-display whitespace-nowrap align-middle tabular-nums">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-semibold ${
                    c.growth >= 0
                      ? "text-success"
                      : "bg-destructive text-white shadow-sm shadow-destructive/40"
                  }`}>
                    {c.growth >= 0 ? "+" : ""}{c.growth.toFixed(1)}%
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
