import { useMemo, useCallback } from "react";
import {
  Bar, CartesianGrid, ComposedChart, LabelList, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { formatBRL, formatBRLCompact, MESES, tpv } from "@/data/tpv";

const COR_2025 = "#3070cd"; // azul
const COR_2026 = "#CB7535"; // laranja

export function ComparativoAnual() {
  const data = useMemo(() => {
    // meses disponíveis em 2026 = horizonte da comparação
    const meses2026 = tpv.meta.mesesPorAno["2026"] ?? [];

    const acc = new Map<number, { mes: number; v2025: number; v2026: number }>();
    for (const m of meses2026) acc.set(m, { mes: m, v2025: 0, v2026: 0 });

    for (const r of tpv.totalTs) {
      if (!acc.has(r.mes)) continue;
      const row = acc.get(r.mes)!;
      if (r.ano === 2025) row.v2025 += r.tpv;
      else if (r.ano === 2026) row.v2026 += r.tpv;
    }

    return Array.from(acc.values())
      .sort((a, b) => a.mes - b.mes)
      .map((r) => {
        // Sem dados suficientes em 2025 ou 2026: variação indefinida (não plotar)
        const hasBoth = r.v2025 > 0 && r.v2026 > 0;
        const variacao = hasBoth ? ((r.v2026 - r.v2025) / r.v2025) * 100 : null;
        return {
          label: MESES[r.mes - 1],
          "2025": r.v2025,
          "2026": r.v2026,
          variacao,
        };
      });
  }, []);

  const yAxisPercentFormatter = useCallback((v: number) => `${v.toFixed(0)}%`, []);

  const labelListPercentFormatter = useCallback(
    (v: number | null | undefined) => (v == null ? "" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`),
    []
  );

  const COR_POS = "hsl(var(--success))";
  const COR_NEG = "#F42722";

  const renderVarDot = useCallback((props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || payload?.variacao == null) return <g />;
    const fill = payload.variacao < 0 ? COR_NEG : COR_POS;
    return <circle cx={cx} cy={cy} r={4} fill={fill} stroke={fill} />;
  }, []);

  const renderVarLabel = useCallback((props: any) => {
    const { x, y, value } = props;
    if (value == null) return null;
    const fill = value < 0 ? COR_NEG : COR_POS;
    const text = `${value >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`;
    return (
      <text x={x} y={y - 8} fill={fill} fontSize={10} textAnchor="middle" fontWeight={600}>
        {text}
      </text>
    );
  }, []);


  const total2025 = data.reduce((s, d) => s + d["2025"], 0);
  const total2026 = data.reduce((s, d) => s + d["2026"], 0);
  const variacaoTotal = total2025 > 0 ? ((total2026 - total2025) / total2025) * 100 : 0;

  const melhor = data.reduce(
    (m, d) => (d.variacao != null && d.variacao > m.variacao ? { label: d.label, variacao: d.variacao } : m),
    { label: "-", variacao: -Infinity } as { label: string; variacao: number }
  );
  const pior = data.reduce(
    (m, d) => (d.variacao != null && d.variacao < m.variacao ? { label: d.label, variacao: d.variacao } : m),
    { label: "-", variacao: Infinity } as { label: string; variacao: number }
  );

  const periodo = data.length
    ? `${data[0].label} a ${data[data.length - 1].label}/2026`
    : "Sem dados";

  return (
    <div className="panel">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Comparativo Anual: 2025 vs. 2026</h3>
          <p className="text-xs text-muted-foreground">TPV mensal · {periodo}</p>
        </div>
        <div className="flex gap-4 text-right text-xs">
          <div>
            <div className="text-white">2025 (acum.)</div>
            <div className="num-display font-semibold" style={{ color: COR_2025 }}>{formatBRL(total2025)}</div>
          </div>
          <div>
            <div className="text-white">2026 (acum.)</div>
            <div className="num-display font-semibold" style={{ color: COR_2026 }}>{formatBRL(total2026)}</div>
          </div>
          <div>
            <div className="text-white">Variação</div>
            <div className={`num-display font-semibold ${variacaoTotal >= 0 ? "text-success" : "text-destructive"}`}>
              {variacaoTotal >= 0 ? "+" : ""}{variacaoTotal.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico: Colunas agrupadas TPV 2025 vs 2026 + linha Variação % YoY */}
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 12, left: -8, bottom: 0 }} barCategoryGap="25%" barGap={2}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="label" stroke="#ffffff" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: "#ffffff" }} />
            <YAxis yAxisId="left" stroke="#ffffff" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#ffffff" }}
              tickFormatter={formatBRLCompact} />
            <YAxis yAxisId="right" orientation="right" stroke="#ffffff" fontSize={11} tickLine={false} axisLine={false}
              tick={{ fill: "#ffffff" }} tickFormatter={yAxisPercentFormatter} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.25)" }}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
                color: "#ffffff",
              }}
              labelStyle={{ color: "#ffffff" }}
              itemStyle={{ color: "#ffffff" }}
              formatter={((v: number, name: string) => {
                if (name === "Variação % YoY") return [`${v >= 0 ? "+" : ""}${v.toFixed(1)}%`, name];
                return [formatBRL(v), name];
              }) as any}
            />
            <Legend wrapperStyle={{ color: "#ffffff", fontSize: 12, paddingTop: 8 }} />
            <Bar yAxisId="left" dataKey="2025" fill={COR_2025} radius={[6, 6, 0, 0]} maxBarSize={56}>
              <LabelList dataKey="2025" position="top" fill="#ffffff" fontSize={10}
                formatter={formatBRLCompact as any} />
            </Bar>
            <Bar yAxisId="left" dataKey="2026" fill={COR_2026} radius={[6, 6, 0, 0]} maxBarSize={56}>
              <LabelList dataKey="2026" position="top" fill="#ffffff" fontSize={10}
                formatter={formatBRLCompact as any} />
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="variacao" name="Variação % YoY"
              stroke="hsl(var(--success))" strokeWidth={2.5}
              dot={{ r: 4, fill: "hsl(var(--success))" }}
              activeDot={{ r: 6 }}>
              <LabelList dataKey="variacao" position="top" fill="#ffffff" fontSize={10}
                formatter={labelListPercentFormatter as any} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>


      <p className="mt-4 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-white">
        <span className="font-semibold text-white">Análise: </span>
        No acumulado {periodo}, 2026 soma {formatBRL(total2026)} contra {formatBRL(total2025)} em 2025
        ({variacaoTotal >= 0 ? "+" : ""}{variacaoTotal.toFixed(1)}%). Melhor mês: {melhor.label} ({melhor.variacao >= 0 ? "+" : ""}{melhor.variacao.toFixed(1)}%).
        Pior mês: {pior.label} ({pior.variacao >= 0 ? "+" : ""}{pior.variacao.toFixed(1)}%).
      </p>
    </div>
  );
}
