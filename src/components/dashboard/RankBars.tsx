import { useMemo, useCallback } from "react";
import {
  Bar, BarChart, Cell, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { dimensionRanking, formatBRL, formatBRLCompact, tpv, type Filtros, type TsRowK } from "@/data/tpv";

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

export function RankBars({ filtros, source, title, subtitle, color = "hsl(var(--accent-cyan))", limit = 8, colorMap }: RankBarsProps) {
  const series = useMemo(() => {
    const arr = dimensionRanking(tpv[source] as TsRowK[], filtros);
    return arr.slice(0, limit).map((s) => ({ name: s.name, value: s.tpv }));
  }, [filtros, source, limit]);

  const tooltipFormatter = useCallback((v: number) => [formatBRL(v), "TPV"], []);

  const yAxisTickRenderer = useCallback((props: any) => {
    const { x, y, payload } = props;
    const fill = colorMap?.[payload.value] ?? "hsl(var(--muted-foreground))";
    const label = payload.value.length > 22 ? payload.value.slice(0, 20) + "…" : payload.value;
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fontWeight={600} fill={fill}>
        {label}
      </text>
    );
  }, [colorMap]);

  const total = series.reduce((s, x) => s + x.value, 0);
  const lider = series[0];
  const liderPct = lider && total > 0 ? (lider.value / total) * 100 : 0;
  const concentracaoTop3 = series.slice(0, 3).reduce((s, x) => s + x.value, 0);
  const top3Pct = total > 0 ? (concentracaoTop3 / total) * 100 : 0;

  const analise = lider
    ? `${lider.name} lidera com ${formatBRL(lider.value)} (${liderPct.toFixed(1)}% do total). Top 3 concentra ${top3Pct.toFixed(1)}% do TPV.`
    : "Sem dados no período selecionado.";

  const height = Math.max(220, series.length * 36);

  return (
    <div className="panel">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} layout="vertical" margin={{ top: 4, right: 160, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" horizontal={false} />
            <XAxis type="number" stroke="#ffffff" fontSize={11}
              tickLine={false} axisLine={false} tick={{ fill: "#ffffff" }} tickFormatter={formatBRLCompact} />
            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12}
              tickLine={false} axisLine={false} width={150}
              tick={yAxisTickRenderer} />
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
              formatter={tooltipFormatter}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {series.map((entry, i) => (
                <Cell key={i} fill={colorMap?.[entry.name] ?? color} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={formatBRL}
                style={{ fill: "#ffffff", fontSize: 11, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-white">
        <span className="font-semibold text-white">Análise: </span>{analise}
      </p>
    </div>
  );
}
