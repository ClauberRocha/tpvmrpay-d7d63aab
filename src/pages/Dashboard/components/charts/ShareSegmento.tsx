import { useMemo, useCallback } from "react";
import { Bar, BarChart, Cell, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DashboardService } from "../../services/DashboardService";

import { formatBRL, formatBRLCompact } from "@/data/tpv";
import type { Filtros } from "@/data/tpv";

const BAR_COLOR = "#51a9cb";
const palette = [BAR_COLOR];

export function ShareSegmento({ filtros }: { filtros: Filtros }) {
  const { series, total, prevMap } = useMemo(() => {
    const f = { ...filtros, segmento: "todos" };
    const arr = DashboardService.getRankings("segmentoTs", f, 100);
    const total = arr.reduce((s, x) => s + x.value, 0);

    const prevMap = new Map<string, number>();
    if (typeof filtros.ano === "number") {
      const prevF = { ...f, ano: filtros.ano - 1 };
      const prevArr = DashboardService.getRankings("segmentoTs", prevF, 100);
      for (const x of prevArr) {
        prevMap.set(x.name, x.value);
      }
    }

    return { series: arr, total, prevMap };
  }, [filtros]);

  const tooltipFormatter = useCallback(
    (v: number) => {
      const pct = total > 0 ? (v / total) * 100 : 0;
      return [`${formatBRL(v)} (${pct.toFixed(1)}% do total)`, "TPV"];
    },
    [total]
  );

  const truncateLabel = useCallback((value: string) => {
    if (!value) return "";
    return value.length > 10 ? `${value.slice(0, 9)}…` : value;
  }, []);

  // Largura mínima por coluna garante barras finas e proporcionais mesmo em telas menores.
  // Quando o total ultrapassa a largura visível, o container ganha rolagem horizontal.
  const MIN_COL_WIDTH = 44;
  const chartInnerWidth = Math.max(series.length * MIN_COL_WIDTH, 320);

  return (
    <div className="panel">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold sm:text-lg">TPV por Segmento</h3>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Participação no TPV & Crescimento YoY · {series.length} segmentos
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Total</span>
          <span className="font-display text-base font-semibold num-display sm:text-lg">{formatBRLCompact(total)}</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto overflow-y-hidden -mx-1 px-1">
        <div style={{ height: 240, minWidth: chartInnerWidth }}>
          {series.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Sem dados no período selecionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 20, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
                <XAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={64}
                  tickMargin={6}
                  minTickGap={0}
                  tickFormatter={truncateLabel}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 600 }}
                />
                <YAxis
                  type="number"
                  stroke="#ffffff"
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tick={{ fill: "#ffffff", fontSize: 9 }}
                  tickFormatter={formatBRLCompact}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    fontSize: 11,
                    color: "#ffffff",
                    padding: "6px 8px",
                  }}
                  labelStyle={{ color: "#ffffff", fontSize: 11, fontWeight: 600 }}
                  itemStyle={{ color: "#ffffff", fontSize: 11 }}
                  formatter={tooltipFormatter as any}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive animationDuration={600}>
                  {series.map((_, i) => (
                    <Cell key={i} fill={palette[i % palette.length]} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={formatBRLCompact as any}
                    style={{ fill: "#ffffff", fontSize: 9, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 max-h-[180px] overflow-auto pr-1">
        {series.map((s, i) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          const prevVal = prevMap.get(s.name) ?? 0;
          const growth = prevVal > 0 ? ((s.value - prevVal) / prevVal) * 100 : 0;
          return (
            <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: palette[i % palette.length] }} />
                <span className="truncate text-foreground/90">{s.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-muted-foreground num-display text-xs">{formatBRL(s.value)}</span>
                {prevVal > 0 && (
                  <span className={`text-[10px] font-semibold num-display rounded-md px-1.5 py-0.5 ${
                    growth >= 0
                      ? "text-success"
                      : "bg-destructive text-white shadow-sm shadow-destructive/40"
                  }`}>
                    {growth >= 0 ? "↑" : "↓"}{Math.abs(growth).toFixed(0)}%
                  </span>
                )}
                <span className="font-mono text-xs font-semibold text-foreground w-12 text-right">{pct.toFixed(1)}%</span>
              </div>
            </li>
          );
        })}
      </ul>

      {(() => {
        const lider = series[0];
        const liderPct = lider && total > 0 ? (lider.value / total) * 100 : 0;
        const top3 = series.slice(0, 3).reduce((s, x) => s + x.value, 0);
        const top3Pct = total > 0 ? (top3 / total) * 100 : 0;
        const analise = lider
          ? `${lider.name} domina com ${liderPct.toFixed(1)}% do TPV. Os 3 maiores segmentos somam ${top3Pct.toFixed(1)}% do total (${formatBRL(top3)}).`
          : "Sem dados no período selecionado.";
        return (
          <p className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-white">
            <span className="font-semibold text-white">Análise: </span>{analise}
          </p>
        );
      })()}
    </div>
  );
}
