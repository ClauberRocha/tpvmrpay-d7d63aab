import { useMemo, useCallback } from "react";
import { Bar, BarChart, Cell, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DashboardService } from "../../services/DashboardService";

import { formatBRL, formatBRLCompact } from "@/data/tpv";
import type { Filtros } from "@/data/tpv";

const palette = [
  "hsl(var(--primary))",
  "hsl(var(--accent-cyan))",
  "hsl(var(--accent-magenta))",
  "hsl(var(--accent-green))",
  "hsl(var(--accent-violet))",
  "hsl(var(--accent-orange))",
  "hsl(45 70% 45%)",
  "hsl(195 60% 35%)",
];

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

  const tooltipFormatter = useCallback((v: number) => [formatBRL(v), "TPV"], []);

  const chartHeight = Math.max(220, series.length * 38);

  return (
    <div className="panel">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">TPV por Segmento</h3>
          <p className="text-xs text-muted-foreground">Participação no TPV & Crescimento YoY</p>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Total</span>
          <span className="font-display text-lg font-semibold num-display">{formatBRLCompact(total)}</span>
        </div>
      </div>

      <div style={{ height: chartHeight }} className="w-full">
        {series.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Sem dados no período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} layout="vertical" margin={{ top: 4, right: 120, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" horizontal={false} />
              <XAxis
                type="number"
                stroke="#ffffff"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#ffffff" }}
                tickFormatter={formatBRLCompact}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={130}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }}
              />
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
              <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={600}>
                {series.map((_, i) => (
                  <Cell key={i} fill={palette[i % palette.length]} />
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
