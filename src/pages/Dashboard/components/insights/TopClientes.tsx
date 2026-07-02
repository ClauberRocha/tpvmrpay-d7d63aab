import { useMemo } from "react";

import { dimensionRanking, formatBRL, formatNumber, getClienteCategoriaMap, tpv, type CategoriaCliente, type Filtros } from "@/data/tpv";

const MESES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const CATEGORIA_STYLES: Record<CategoriaCliente, string> = {
  Diamante: "bg-chart-cyan/15 text-chart-cyan border-chart-cyan/40",
  Ouro: "bg-chart-orange/15 text-chart-orange border-chart-orange/40",
  Prata: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/40",
  Bronze: "bg-chart-magenta/15 text-chart-magenta border-chart-magenta/40",
  "TPV Zerado": "bg-muted/40 text-muted-foreground border-border/60",
};

export function TopClientes({ filtros }: { filtros: Filtros }) {
  const items = useMemo(() => {
    const catMap = getClienteCategoriaMap();
    const arr = dimensionRanking(tpv.clienteTs, filtros)
      .slice(0, 10)
      .map((c) => ({ ...c, ticket: c.tx > 0 ? c.tpv / c.tx : 0, categoria: catMap.get(c.name) as CategoriaCliente | undefined }));
    return arr;
  }, [filtros]);

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
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Top 10 Clientes</h3>
          <p className="text-xs text-muted-foreground">Ranking por TPV · {periodoTxt}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Cliente</th>
              <th className="px-4 py-3 text-right font-medium">TPV</th>
              <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Meses ativos</th>
              <th className="px-4 py-3 text-right font-medium hidden lg:table-cell">Média/mês</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c, i) => (
              <tr key={c.name} className="border-t border-border/60 transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground align-top">{String(i + 1).padStart(2, "0")}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground line-clamp-1" title={c.name}>{c.name}</div>
                  <div className="mt-1.5 h-1 w-full max-w-[260px] rounded-full bg-border/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-chart-orange"
                      style={{ width: `${(c.tpv / max) * 100}%` }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <span className="num-display font-semibold text-foreground">{formatBRL(c.tpv)}</span>
                    {c.categoria && (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${CATEGORIA_STYLES[c.categoria]}`}>
                        {c.categoria}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right num-display text-muted-foreground hidden md:table-cell">
                  {formatNumber(c.tx)}
                </td>
                <td className="px-4 py-3 text-right num-display text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                  {formatBRL(c.ticket)}
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
