import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { dimensionRanking, formatBRL, formatBRLCompact, tpv, type Filtros } from "@/data/tpv";

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
  const { series, total } = useMemo(() => {
    // Filtro de segmento é ignorado para mostrar a participação total/proporcional
    const f = { ...filtros, segmento: "todos" };
    const arr = dimensionRanking(tpv.segmentoTs, f);
    const total = arr.reduce((s, x) => s + x.tpv, 0);
    return { series: arr, total };
  }, [filtros]);

  return (
    <div className="panel">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold">TPV por Segmento</h3>
        <p className="text-xs text-muted-foreground">Participação no TPV</p>
      </div>
      <div className="grid grid-cols-1 gap-4 items-center">
        <div className="h-[220px] w-full min-w-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={series}
                dataKey="tpv"
                nameKey="name"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={2}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {series.map((_, i) => (
                  <Cell key={i} fill={palette[i % palette.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "#ffffff",
                }}
                labelStyle={{ color: "#ffffff" }}
                itemStyle={{ color: "#ffffff" }}
                formatter={(v: number, n) => [formatBRL(v), n as string]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</span>
            <span className="font-display text-lg font-semibold num-display">{formatBRLCompact(total)}</span>
          </div>
        </div>
        <ul className="space-y-1.5 max-h-[220px] overflow-auto pr-1">
          {series.map((s, i) => {
            const pct = total > 0 ? (s.tpv / total) * 100 : 0;
            return (
              <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: palette[i % palette.length] }} />
                  <span className="truncate text-foreground/90">{s.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-muted-foreground num-display text-xs">{formatBRL(s.tpv)}</span>
                  <span className="font-mono text-xs font-semibold text-foreground w-12 text-right">{pct.toFixed(1)}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {(() => {
        const lider = series[0];
        const liderPct = lider && total > 0 ? (lider.tpv / total) * 100 : 0;
        const top3 = series.slice(0, 3).reduce((s, x) => s + x.tpv, 0);
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
