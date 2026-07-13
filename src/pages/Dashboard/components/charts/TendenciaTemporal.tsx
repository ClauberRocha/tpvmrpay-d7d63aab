import { useMemo, useCallback, useState, useEffect } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

import { formatBRL, formatBRLCompact, formatNumber, MESES, monthlySeries, totalsFiltered, type Filtros } from "@/data/tpv";
import { BUILD_ID, hardReload, purgeClientCaches } from "@/lib/buildInfo";
import { exportToCsv } from "@/utils/exportCsv";

export function TendenciaTemporal({ filtros }: { filtros: Filtros }) {
  const [ready, setReady] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const { series, total, media, mismatch, totalTx, periodoLabel } = useMemo(() => {
    const raw = monthlySeries(filtros);
    const s = raw.map((p) => ({
      label: `${MESES[p.mes - 1]}/${String(p.ano).slice(2)}`,
      ano: p.ano,
      mes: p.mes,
      tpv: p.tpv,
    }));
    const t = s.reduce((acc, p) => acc + p.tpv, 0);
    const { tpv: totalRef, tx } = totalsFiltered(filtros);
    const diff = t - totalRef;
    const isMismatch = Math.abs(diff) > 1;
    if (import.meta.env.DEV && isMismatch) {
      console.warn(
        `[TendenciaTemporal] Divergência: série=${t.toFixed(2)} vs total=${totalRef.toFixed(2)}`
      );
    }
    const first = s[0];
    const last = s[s.length - 1];
    const periodo = s.length
      ? s.length === 1
        ? first.label
        : `${first.label} → ${last.label} (${s.length} meses)`
      : "Sem meses no período";
    return {
      series: s,
      total: t,
      totalTx: tx,
      media: s.length ? t / s.length : 0,
      mismatch: isMismatch ? { serie: t, total: totalRef, diff } : null,
      periodoLabel: periodo,
    };
  }, [filtros]);

  useEffect(() => {
    setReady(false);
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [filtros]);

  const tooltipFormatter = useCallback(
    (v: number) => {
      const pct = total > 0 ? (v / total) * 100 : 0;
      return [`${formatBRL(v)} (${pct.toFixed(1)}% do total)`, "TPV"];
    },
    [total]
  );

  const semFiltroSegUf = filtros.segmento === "todos" && filtros.uf === "todos";
  const subtitulo = semFiltroSegUf
    ? "Captação mensal"
    : `Captação mensal · ${filtros.segmento !== "todos" ? filtros.segmento : filtros.uf}`;

  const mesesLabel = filtros.meses.length === 0
    ? "todos"
    : filtros.meses.slice().sort((a, b) => a - b).map((m) => MESES[m - 1]).join(", ");
  const anoLabel = filtros.ano === "todos" ? "todos" : String(filtros.ano);



  return (
    <div className="panel">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Evolução do TPV</h3>
          <p className="text-xs text-muted-foreground">{subtitulo}</p>
        </div>
        <div className="flex gap-4 text-right text-xs">
          <div>
            <div className="text-muted-foreground">Período</div>
            <div className="num-display font-semibold text-foreground">{formatBRL(total)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Média/mês</div>
            <div className="num-display font-semibold text-foreground">{formatBRL(media)}</div>
          </div>
        </div>
      </div>
      {mismatch && (
        <div
          role="alert"
          data-testid="tpv-mismatch-warning"
          className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
        >
          <span aria-hidden className="mt-0.5">⚠️</span>
          <div>
            <div className="font-semibold">Divergência detectada na agregação</div>
            <div className="text-amber-100/80">
              Soma da série: {formatBRL(mismatch.serie)} · Total filtrado: {formatBRL(mismatch.total)} · Diferença: {formatBRL(mismatch.diff)}
            </div>
          </div>
        </div>
      )}
      <div className="h-[300px] w-full">
        {!ready ? (
          <div className="flex h-full w-full flex-col justify-end gap-2 p-2" aria-busy="true" aria-label="Carregando gráfico">
            <div className="flex h-full items-end gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 animate-pulse rounded-t bg-muted/40"
                  style={{ height: `${40 + ((i * 37) % 55)}%` }}
                />
              ))}
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="areaPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="label" stroke="#ffffff" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#ffffff" }} />
              <YAxis stroke="#ffffff" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#ffffff" }}
                tickFormatter={formatBRLCompact} />
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
                formatter={tooltipFormatter as any}
              />
              <Area
                type="monotone"
                dataKey="tpv"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#areaPrimary)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {(() => {
        if (series.length < 2) {
          return (
            <p className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-white">
              <span className="font-semibold text-white">Análise: </span>
              {series.length === 1 ? `Único mês no período: ${formatBRL(series[0].tpv)}.` : "Sem dados no período selecionado."}
            </p>
          );
        }
        const ult = series[series.length - 1];
        const pen = series[series.length - 2];
        const variacao = pen.tpv > 0 ? ((ult.tpv - pen.tpv) / pen.tpv) * 100 : 0;
        const tend = variacao >= 0 ? "alta" : "queda";
        const pico = series.reduce((m, p) => (p.tpv > m.tpv ? p : m), series[0]);
        return (
          <p className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-white">
            <span className="font-semibold text-white">Análise: </span>
            {ult.label} fechou em {formatBRL(ult.tpv)}, {tend} de {Math.abs(variacao).toFixed(1)}% vs {pen.label}. Pico em {pico.label} ({formatBRL(pico.tpv)}). Média mensal de {formatBRL(media)}.
          </p>
        );
      })()}

      <div className="mt-3 rounded-lg border border-border/50 bg-muted/10">
        <button
          type="button"
          onClick={() => setAuditOpen((v) => !v)}
          aria-expanded={auditOpen}
          aria-controls="tpv-audit-panel"
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-white hover:bg-muted/20"
        >
          <span>🔎 Auditoria do cálculo (Evolução do TPV)</span>
          <span className="text-muted-foreground">{auditOpen ? "▲" : "▼"}</span>
        </button>
        {auditOpen && (
          <div id="tpv-audit-panel" className="space-y-3 border-t border-border/40 px-3 py-3 text-xs text-white">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <div className="text-muted-foreground">Período</div>
                <div className="num-display">{periodoLabel}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Transações no período</div>
                <div className="num-display">{formatNumber(totalTx)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">TPV agregado (série)</div>
                <div className="num-display">{formatBRL(total)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">TPV de referência (totalsFiltered)</div>
                <div className="num-display">{formatBRL(totalsFiltered(filtros).tpv)}</div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-muted-foreground">Filtros ativos</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-md border border-border/50 bg-background/40 px-2 py-0.5">ano: <b>{anoLabel}</b></span>
                <span className="rounded-md border border-border/50 bg-background/40 px-2 py-0.5">meses: <b>{mesesLabel}</b></span>
                <span className="rounded-md border border-border/50 bg-background/40 px-2 py-0.5">segmento: <b>{filtros.segmento}</b></span>
                <span className="rounded-md border border-border/50 bg-background/40 px-2 py-0.5">uf: <b>{filtros.uf}</b></span>
              </div>
            </div>

            {series.length > 0 && (
              <div>
                <div className="mb-1 text-muted-foreground">Composição mensal</div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] border-collapse text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="border-b border-border/40 px-2 py-1 text-left font-medium">Mês</th>
                        <th className="border-b border-border/40 px-2 py-1 text-right font-medium">TPV</th>
                        <th className="border-b border-border/40 px-2 py-1 text-right font-medium">% do total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.map((p) => (
                        <tr key={`${p.ano}-${p.mes}`}>
                          <td className="border-b border-border/20 px-2 py-1">{p.label}</td>
                          <td className="num-display border-b border-border/20 px-2 py-1 text-right">{formatBRL(p.tpv)}</td>
                          <td className="num-display border-b border-border/20 px-2 py-1 text-right">
                            {total > 0 ? ((p.tpv / total) * 100).toFixed(1) : "0.0"}%
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-2 py-1 font-semibold">Σ Soma</td>
                        <td className="num-display px-2 py-1 text-right font-semibold">{formatBRL(total)}</td>
                        <td className="num-display px-2 py-1 text-right font-semibold">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
              <span>Build: <span className="num-display text-white">{BUILD_ID}</span></span>
              <button
                type="button"
                onClick={async () => { await purgeClientCaches(); hardReload(); }}
                className="rounded-md border border-border/60 bg-background/40 px-2 py-1 text-white hover:bg-muted/30"
              >
                Limpar cache e recarregar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
