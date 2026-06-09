import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Sparkles, TrendingUp, Users } from "lucide-react";
import { dimensionRanking, formatBRL, formatBRLCompact, tpv, type Filtros } from "@/data/tpv";

export function MapaUF({ filtros }: { filtros: Filtros }) {
  const items = useMemo(() => {
    const f = { ...filtros, uf: "todos" };
    const arr = dimensionRanking(tpv.ufTs, f);
    const max = Math.max(...arr.map((a) => a.tpv), 1);
    return arr.map((a) => ({ ...a, intensity: a.tpv / max }));
  }, [filtros]);

  // Ranking de crescimento (vs ano anterior, mesmos meses)
  const crescimento = useMemo(() => {
    if (filtros.ano === "todos") return [];
    const anoAtual = filtros.ano as number;
    const anoAnt = anoAtual - 1;
    if (!tpv.meta.anos.includes(anoAnt)) return [];
    const fAtual = { ...filtros, uf: "todos" };
    const fAnt = { ...filtros, ano: anoAnt, uf: "todos" };
    const atual = new Map(dimensionRanking(tpv.ufTs, fAtual).map((x) => [x.name, x.tpv]));
    const ant = new Map(dimensionRanking(tpv.ufTs, fAnt).map((x) => [x.name, x.tpv]));
    const out: { name: string; atual: number; ant: number; pct: number; abs: number }[] = [];
    for (const [name, a] of atual) {
      const p = ant.get(name) ?? 0;
      const abs = a - p;
      const pct = p > 0 ? (abs / p) * 100 : a > 0 ? 100 : 0;
      out.push({ name, atual: a, ant: p, abs, pct });
    }
    return out.sort((a, b) => b.pct - a.pct);
  }, [filtros]);

  // Oportunidade: alto ticket médio com baixa participação no TPV total
  const oportunidade = useMemo(() => {
    const total = items.reduce((s, x) => s + x.tpv, 0);
    return items
      .map((x) => {
        const ticket = x.tx > 0 ? x.tpv / x.tx : 0;
        const share = total > 0 ? x.tpv / total : 0;
        // score: ticket alto + baixa participação
        const score = ticket * (1 - share);
        return { ...x, ticket, share, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [items]);

  // Densidade comercial: transações por UF
  const densidade = useMemo(() => {
    return [...items].sort((a, b) => b.tx - a.tx);
  }, [items]);

  const total = items.reduce((s, x) => s + x.tpv, 0);
  const lider = items[0];
  const liderPct = lider && total > 0 ? (lider.tpv / total) * 100 : 0;
  const topCresc = crescimento[0];
  const topOport = oportunidade[0];
  const topDens = densidade[0];

  return (
    <div className="panel">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Mapa Estratégico de Expansão</h3>
          <p className="text-xs text-muted-foreground">Heatmap, crescimento, oportunidade e densidade por UF</p>
        </div>
        <span className="text-xs text-muted-foreground">{items.length} UFs</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((s) => (
          <div
            key={s.name}
            className="relative overflow-hidden rounded-xl border border-border/60 p-3 transition-transform hover:-translate-y-0.5"
            style={{
              background: `linear-gradient(135deg, hsl(var(--primary) / ${0.05 + s.intensity * 0.4}), hsl(var(--card)))`,
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-sm font-bold text-foreground truncate" title={s.name}>
                {s.name}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">{s.tx} tx</span>
            </div>
            <div className="mt-2 num-display text-sm font-semibold text-foreground">
              {formatBRL(s.tpv)}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-border/60">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(8, s.intensity * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Inteligência estratégica */}
      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Crescimento */}
        <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-md bg-success/15 p-1.5 text-success">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Ranking de Crescimento</h4>
              <p className="text-[10px] text-muted-foreground">Variação YoY (mesmos meses)</p>
            </div>
          </div>
          {crescimento.length === 0 ? (
            <p className="text-xs text-muted-foreground">Selecione um ano com histórico anterior.</p>
          ) : (
            <ul className="space-y-1.5">
              {crescimento.slice(0, 5).map((c) => (
                <li key={c.name} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{formatBRLCompact(c.abs)}</span>
                    <span
                      className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${
                        c.pct >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {c.pct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {c.pct >= 0 ? "+" : ""}{c.pct.toFixed(1)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Oportunidade */}
        <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-md bg-chart-violet/15 p-1.5 text-chart-violet">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Ranking de Oportunidade</h4>
              <p className="text-[10px] text-muted-foreground">Alto ticket + baixa penetração</p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {oportunidade.slice(0, 5).map((o) => (
              <li key={o.name} className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{o.name}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span title="Ticket médio">{formatBRLCompact(o.ticket)}</span>
                  <span className="rounded-md bg-chart-violet/10 px-1.5 py-0.5 font-semibold text-chart-violet">
                    {(o.share * 100).toFixed(1)}% share
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Densidade comercial */}
        <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-md bg-chart-cyan/15 p-1.5 text-chart-cyan">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Densidade Comercial</h4>
              <p className="text-[10px] text-muted-foreground">Volume de transações por UF</p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {densidade.slice(0, 5).map((d) => {
              const totalTx = densidade.reduce((s, x) => s + x.tx, 0);
              const pct = totalTx > 0 ? (d.tx / totalTx) * 100 : 0;
              return (
                <li key={d.name} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{d.name}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{d.tx.toLocaleString("pt-BR")} tx</span>
                    <span className="rounded-md bg-chart-cyan/10 px-1.5 py-0.5 font-semibold text-chart-cyan">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Síntese */}
      <div className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-white">
        <span className="font-semibold">🌎 Potencial de Mercado: </span>
        {lider ? (
          <>
            <span className="text-foreground">{lider.name}</span> lidera com {liderPct.toFixed(1)}% do TPV ({formatBRL(lider.tpv)}).
            {topCresc && topCresc.pct > 0 && (
              <> <span className="text-foreground">{topCresc.name}</span> apresenta o maior crescimento absoluto ({topCresc.pct >= 0 ? "+" : ""}{topCresc.pct.toFixed(1)}%).</>
            )}
            {topOport && (
              <> <span className="text-foreground">{topOport.name}</span> mostra alta oportunidade — ticket médio de {formatBRL(topOport.ticket)} com apenas {(topOport.share * 100).toFixed(1)}% de participação.</>
            )}
            {topDens && (
              <> <span className="text-foreground">{topDens.name}</span> tem a maior densidade comercial ({topDens.tx.toLocaleString("pt-BR")} transações).</>
            )}
          </>
        ) : (
          "Sem UFs com TPV no período selecionado."
        )}
      </div>
    </div>
  );
}
