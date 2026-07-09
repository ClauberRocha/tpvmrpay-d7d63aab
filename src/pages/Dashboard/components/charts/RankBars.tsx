import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useCallback, useState } from "react";
import {
  Bar, BarChart, Cell, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { DashboardService } from "../../services/DashboardService";

import { formatBRL, formatBRLCompact } from "@/data/tpv";
import type { Filtros, tpv } from "@/data/tpv";
import { exportToCsv } from "@/utils/exportCsv";

interface RankBarsProps {
  filtros: Filtros;
  source: keyof Pick<typeof tpv, "categoriaTs" | "proprietarioTs" | "municipioTs" | "ufTs" | "clienteTs" | "segmentoTs">;
  title: string;
  subtitle: string;
  color?: string;
  limit?: number;
  /** Mapa nome -> cor HSL para colorir cada barra individualmente */
  colorMap?: Record<string, string>;
}

const PAGE_SIZE = 6;

export function RankBars({ filtros, source, title, subtitle, color = "hsl(var(--accent-cyan))", limit = 10, colorMap }: RankBarsProps) {
  const [selectedLimit, setSelectedLimit] = useState<number | "todos">(limit);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch full ranking (up to 100) for search/pagination
  const fullSeries = useMemo(() => {
    return DashboardService.getRankings(source, filtros, 100);
  }, [filtros, source]);

  // Filter based on search query
  const filteredSeries = useMemo(() => {
    return fullSeries.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fullSeries, searchQuery]);

  // Apply selected limit
  const limitedSeries = useMemo(() => {
    if (selectedLimit === "todos") return filteredSeries;
    return filteredSeries.slice(0, selectedLimit);
  }, [filteredSeries, selectedLimit]);

  // Paginate items
  const totalPages = Math.max(1, Math.ceil(limitedSeries.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedSeries = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return limitedSeries.slice(start, start + PAGE_SIZE);
  }, [limitedSeries, activePage]);

  const handleExport = () => {
    const csvData = limitedSeries.map((s, idx) => [
      idx + 1,
      s.name,
      s.value,
    ]);
    exportToCsv(csvData, `ranking_${source}.csv`, ["Posicao", "Nome", "TPV_Reais"]);
  };

  const tooltipFormatter = useCallback((v: number) => [formatBRL(v), "TPV"], []);

  const yAxisTickRenderer = useCallback((props: { x: number; y: number; payload: { value: string } }) => {
    const { x, y, payload } = props;
    const fill = colorMap?.[payload.value] ?? "hsl(var(--muted-foreground))";
    const label = payload.value.length > 20 ? payload.value.slice(0, 18) + "…" : payload.value;
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fontWeight={600} fill={fill}>
        {label}
      </text>
    );
  }, [colorMap]);

  const total = limitedSeries.reduce((s, x) => s + x.value, 0);
  const lider = limitedSeries[0];
  const liderPct = lider && total > 0 ? (lider.value / total) * 100 : 0;
  const concentracaoTop3 = limitedSeries.slice(0, 3).reduce((s, x) => s + x.value, 0);
  const top3Pct = total > 0 ? (concentracaoTop3 / total) * 100 : 0;

  const analise = lider
    ? `${lider.name} lidera com ${formatBRL(lider.value)} (${liderPct.toFixed(1)}% do TPV exibido). Top 3 concentra ${top3Pct.toFixed(1)}% do TPV.`
    : "Sem dados no período selecionado.";

  const chartHeight = Math.max(180, paginatedSeries.length * 36);

  return (
    <div className="panel">
      {/* Header and export */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedLimit}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedLimit(val === "todos" ? "todos" : Number(val));
              setCurrentPage(1);
            }}
            className="rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value="todos">Todos</option>
          </select>
          <button
            onClick={handleExport}
            className="rounded-lg p-1.5 border border-border/85 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Exportar CSV"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-4 relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
        </span>
        <input
          type="text"
          placeholder="Pesquisar no ranking..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full rounded-lg border border-border/60 bg-muted/20 py-1.5 pl-9 pr-4 text-xs placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Chart container */}
      <div style={{ height: chartHeight }} className="w-full relative">
        {paginatedSeries.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Nenhum resultado correspondente
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paginatedSeries} layout="vertical" margin={{ top: 4, right: 120, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" horizontal={false} />
              <XAxis type="number" stroke="#ffffff" fontSize={10}
                tickLine={false} axisLine={false} tick={{ fill: "#ffffff" }} tickFormatter={formatBRLCompact} />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11}
                tickLine={false} axisLine={false} width={130}
                tick={yAxisTickRenderer as any} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "#ffffff",
                }}
                labelStyle={{ color: "#ffffff" }}
                itemStyle={{ color: "#ffffff" }}
                formatter={tooltipFormatter as any}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={true} animationDuration={600}>
                {paginatedSeries.map((entry, i) => (
                  <Cell key={i} fill={colorMap?.[entry.name] ?? color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={formatBRLCompact as any}
                  style={{ fill: "#ffffff", fontSize: 10, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-3">
          <span className="text-[11px] text-muted-foreground">
            Exibindo {paginatedSeries.length} de {limitedSeries.length} itens
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={activePage === 1}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-medium text-foreground px-2">
              Página {activePage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={activePage === totalPages}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Business Analysis comment */}
      <p className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-white">
        <span className="font-semibold text-white">Análise: </span>{analise}
      </p>
    </div>
  );
}
