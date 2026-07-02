import { Lightbulb, Target, TrendingUp, Users, Crown, Sparkles, Brain, AlertTriangle, TrendingDown, Loader2, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Slider } from "@/components/ui/slider";
import {
  dimensionRanking, formatBRL, formatNumber, monthlySeries,
  tpv, type Filtros,
} from "@/data/tpv";
import { supabase } from "@/integrations/supabase/client";


const MESES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type AnaliseIA = {
  anomalias: { periodo: string; tipo: "pico" | "queda"; severidade: "baixa" | "media" | "alta"; descricao: string }[];
  crescimento_incomum: { dimensao: string; nome: string; descricao: string }[];
  quedas_tpv: { contexto: string; impacto: string; recomendacao: string }[];
  risco_churn: { nivel: "baixo" | "medio" | "alto"; descricao: string; clientes_em_risco?: string[] };
  projecao_receita: {
    proximos_meses: { periodo: string; base: number; otimista: number; pessimista: number }[];
    comentario: string;
  };
  resumo_executivo: string;
};

export function AnaliseInsights({ filtros }: { filtros: Filtros }) {
  const [taxaPct, setTaxaPct] = useState<number>(2);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaResult, setIaResult] = useState<AnaliseIA | null>(null);
  const insights = useMemo(() => {
    // Série mensal (sem filtro de seg/uf para visão macro)
    const macroF = { ...filtros, segmento: "todos", uf: "todos" };
    const serie = monthlySeries(macroF);
    const total = serie.reduce((s, p) => s + p.tpv, 0);
    const media = serie.length ? total / serie.length : 0;

    // Projeção 2026: crescimento de 2% ao mês sobre o mesmo mês de 2025
    // Sempre projeta os 3 meses seguintes ao último mês fechado de 2026
    const meses2026 = tpv.meta.mesesPorAno["2026"] ?? [];
    const ultimoMes2026 = meses2026.length ? Math.max(...meses2026) : 0;
    const tpv2025PorMes = new Map<number, number>();
    for (const r of tpv.totalTs) {
      if (r.ano === 2025) tpv2025PorMes.set(r.mes, (tpv2025PorMes.get(r.mes) ?? 0) + r.tpv);
    }
    const TAXA = taxaPct / 100;
    const projetar = (mes: number) => {
      const base = tpv2025PorMes.get(mes) ?? 0;
      return base * Math.pow(1 + TAXA, mes); // crescimento composto a.m.
    };
    const m1 = ((ultimoMes2026) % 12) + 1;
    const m2 = (m1 % 12) + 1;
    const m3 = (m2 % 12) + 1;
    const proj1 = projetar(m1);
    const proj2 = projetar(m2);
    const proj3 = projetar(m3);

    // Mantém slope para texto descritivo da tendência observada
    let slope = 0;
    if (serie.length >= 2) {
      const n = serie.length;
      const xs = serie.map((_, i) => i);
      const ys = serie.map((p) => p.tpv);
      const mx = xs.reduce((a, b) => a + b, 0) / n;
      const my = ys.reduce((a, b) => a + b, 0) / n;
      const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
      const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
      slope = den > 0 ? num / den : 0;
    }
    const ultimo = serie[serie.length - 1];

    const labelProj1 = `${MESES_LBL[m1 - 1]}/26`;
    const labelProj2 = `${MESES_LBL[m2 - 1]}/26`;
    const labelProj3 = `${MESES_LBL[m3 - 1]}/26`;

    // 80/20 — Clientes
    const clientes = dimensionRanking(tpv.clienteTs, filtros);
    const totalClientes = clientes.reduce((s, c) => s + c.tpv, 0);
    let acc = 0;
    let n80 = 0;
    for (const c of clientes) {
      acc += c.tpv;
      n80++;
      if (acc / totalClientes >= 0.8) break;
    }
    const pct80 = clientes.length > 0 ? (n80 / clientes.length) * 100 : 0;
    const top5Clientes = clientes.slice(0, 5);
    const top5Soma = top5Clientes.reduce((s, c) => s + c.tpv, 0);
    const top5Pct = totalClientes > 0 ? (top5Soma / totalClientes) * 100 : 0;

    // Segmentos
    const segs = dimensionRanking(tpv.segmentoTs, { ...filtros, segmento: "todos" });
    const totalSeg = segs.reduce((s, x) => s + x.tpv, 0);
    const segLider = segs[0];
    const segLiderPct = segLider && totalSeg > 0 ? (segLider.tpv / totalSeg) * 100 : 0;

    // UFs
    const ufs = dimensionRanking(tpv.ufTs, { ...filtros, uf: "todos" });
    const totalUF = ufs.reduce((s, x) => s + x.tpv, 0);
    const ufLider = ufs[0];
    const ufLiderPct = ufLider && totalUF > 0 ? (ufLider.tpv / totalUF) * 100 : 0;
    const ufsBaixaCobertura = ufs.filter((u) => u.tpv / totalUF < 0.02);

    // Proprietários
    const props = dimensionRanking(tpv.proprietarioTs, filtros);
    const totalProp = props.reduce((s, x) => s + x.tpv, 0);
    const propLider = props[0];
    const propLiderPct = propLider && totalProp > 0 ? (propLider.tpv / totalProp) * 100 : 0;
    const propBaixaPerf = props.filter((p) => p.tpv / totalProp < 0.05);

    // Categorias (Diamante/Ouro/Prata/Bronze)
    const cats = dimensionRanking(tpv.categoriaTs, filtros);
    const diamante = cats.find((c) => c.name === "Diamante");
    const totalCat = cats.reduce((s, x) => s + x.tpv, 0);
    const diamPct = diamante && totalCat > 0 ? (diamante.tpv / totalCat) * 100 : 0;

    return {
      total, media, slope, ultimo,
      proj1, proj2, proj3, labelProj1, labelProj2, labelProj3,
      clientes, n80, pct80, top5Clientes, top5Pct,
      segLider, segLiderPct,
      ufLider, ufLiderPct, ufsBaixaCobertura,
      propLider, propLiderPct, propBaixaPerf,
      diamante, diamPct,
    };
  }, [filtros, taxaPct]);

  const tendenciaTxt = insights.slope > 0
    ? `crescimento de ${formatBRL(insights.slope)}/mês`
    : insights.slope < 0
      ? `queda de ${formatBRL(Math.abs(insights.slope))}/mês`
      : "estabilidade";

  const macroSerie = useMemo(() => monthlySeries({ ...filtros, segmento: "todos", uf: "todos" }), [filtros]);

  const runAnaliseIA = async () => {
    setIaLoading(true);
    setIaResult(null);
    try {
      const payload = {
        filtros,
        serie_mensal: macroSerie.map((p) => ({
          periodo: `${MESES_LBL[p.mes - 1]}/${String(p.ano).slice(-2)}`,
          tpv: Math.round(p.tpv),
        })),
        media_mensal: Math.round(insights.media),
        tendencia: tendenciaTxt,
        top_clientes: insights.top5Clientes.map((c) => ({ nome: c.name, tpv: Math.round(c.tpv) })),
        pareto: { clientes_80pct: insights.n80, pct_base: Number(insights.pct80.toFixed(1)) },
        segmento_lider: insights.segLider ? { nome: insights.segLider.name, pct: Number(insights.segLiderPct.toFixed(1)) } : null,
        uf_lider: insights.ufLider ? { nome: insights.ufLider.name, pct: Number(insights.ufLiderPct.toFixed(1)) } : null,
        ufs_baixa_cobertura: insights.ufsBaixaCobertura.length,
        proprietarios_baixa_perf: insights.propBaixaPerf.length,
        categoria_diamante_pct: Number(insights.diamPct.toFixed(1)),
      };
      const { data, error } = await supabase.functions.invoke("analise-ia", { body: payload });
      if (error) throw error;
      const dataObj = data as { error?: string } | null;
      if (dataObj?.error) throw new Error(dataObj.error);
      setIaResult(data as AnaliseIA);
    } catch (e) {
      const err = e as { message?: string };
      console.error(err);
      toast.error(err.message || "Erro ao executar análise IA");
    } finally {
      setIaLoading(false);
    }
  };

  return (
    <div className="panel">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-display text-2xl font-bold">Análise Estratégica & Projeções</h3>
          <p className="text-sm text-muted-foreground">
            Insights práticos para onde investir esforços e campanhas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card 1: Tendência e Projeções */}
        <div className="rounded-xl border border-border/60 bg-muted/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-chart-green" />
            <h4 className="font-display text-base font-semibold">Tendência & Projeção</h4>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            O TPV apresenta <span className="font-semibold text-foreground">{tendenciaTxt}</span>{" "}
            considerando o histórico recente. A média mensal é de{" "}
            <span className="font-semibold text-foreground">{formatBRL(insights.media)}</span>.
          </p>

          <div className="mt-4 rounded-lg border border-border/50 bg-background/50 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-foreground/90">
                Taxa de crescimento mensal
              </label>
              <span className="num-display rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                {taxaPct}% a.m.
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[taxaPct]}
              onValueChange={(v) => setTaxaPct(v[0] ?? 2)}
              className="mt-1"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>1%</span>
              <span>10%</span>
            </div>
          </div>

          {insights.ultimo && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-background/60 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{insights.labelProj1}</div>
                <div className="num-display mt-1 text-sm font-bold text-foreground">{formatBRL(insights.proj1)}</div>
              </div>
              <div className="rounded-lg bg-background/60 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{insights.labelProj2}</div>
                <div className="num-display mt-1 text-sm font-bold text-foreground">{formatBRL(insights.proj2)}</div>
              </div>
              <div className="rounded-lg bg-background/60 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{insights.labelProj3}</div>
                <div className="num-display mt-1 text-sm font-bold text-foreground">{formatBRL(insights.proj3)}</div>
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Projeção para 2026 baseada no TPV mensal de 2025 com crescimento composto de {taxaPct}% ao mês. Sempre exibe os 3 meses seguintes ao último mês fechado.
          </p>
        </div>

        {/* Card 2: Regra 80/20 */}
        <div className="rounded-xl border border-border/60 bg-muted/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h4 className="font-display text-base font-semibold">Regra 80/20 (Pareto)</h4>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            <span className="font-semibold text-foreground">{insights.n80} clientes</span>{" "}
            ({insights.pct80.toFixed(1)}% da base de {formatNumber(insights.clientes.length)}) geram{" "}
            <span className="font-semibold text-primary">80% do TPV</span>. Esses são os clientes
            estratégicos para retenção e expansão.
          </p>
          <div className="mt-4 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Top 5 representam {insights.top5Pct.toFixed(1)}% do total
            </div>
            {insights.top5Clientes.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between rounded-md bg-background/60 px-3 py-1.5 text-xs">
                <span className="flex items-center gap-2 truncate">
                  <span className="font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="truncate text-foreground/90" title={c.name}>{c.name}</span>
                </span>
                <span className="num-display font-semibold text-foreground whitespace-nowrap">{formatBRL(c.tpv)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Concentração & Riscos */}
        <div className="rounded-xl border border-border/60 bg-muted/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Crown className="h-5 w-5 text-chart-orange" />
            <h4 className="font-display text-base font-semibold">Concentração & Riscos</h4>
          </div>
          <ul className="space-y-2.5 text-sm text-foreground/90 leading-relaxed">
            {insights.segLider && (
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-orange" />
                <span>
                  Segmento <span className="font-semibold text-foreground">{insights.segLider.name}</span>{" "}
                  responde por {insights.segLiderPct.toFixed(1)}% do TPV — alta dependência.
                </span>
              </li>
            )}
            {insights.ufLider && (
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-orange" />
                <span>
                  <span className="font-semibold text-foreground">{insights.ufLider.name}</span>{" "}
                  concentra {insights.ufLiderPct.toFixed(1)}% da captação.
                  {insights.ufsBaixaCobertura.length > 0 && (
                    <> {insights.ufsBaixaCobertura.length} UFs operam com menos de 2% — oportunidade de expansão.</>
                  )}
                </span>
              </li>
            )}
            {insights.diamante && (
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-cyan" />
                <span>
                  Categoria <span className="font-semibold text-foreground">Diamante</span>{" "}
                  concentra {insights.diamPct.toFixed(1)}% do TPV — proteja com SLA premium e gerente dedicado.
                  <span className="mt-2 block text-foreground/80">
                    Enquanto um cliente comum pode esperar 24h ou 48h por uma resposta, o cliente Diamante tem garantia de retorno em minutos ou poucas horas. Em caso de erros ou falhas técnicas, o chamado do cliente Diamante "fura a fila" e vai direto para os especialistas.
                  </span>
                  <span className="mt-2 block text-foreground/80">
                    <span className="font-semibold text-foreground">Em resumo:</span> É tratar o risco proporcionalmente ao faturamento que ele gera. Se eles trazem 60% do dinheiro, eles recebem 60% (ou mais) da atenção e rapidez da operação.
                  </span>
                </span>
              </li>
            )}
            {insights.propLider && (
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-magenta" />
                <span>
                  Proprietário <span className="font-semibold text-foreground">{insights.propLider.name}</span>{" "}
                  detém {insights.propLiderPct.toFixed(1)}% da carteira — replicar metodologia para os demais.
                </span>
              </li>
            )}
          </ul>
        </div>

        {/* Card 4: Recomendações */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h4 className="font-display text-base font-semibold">Onde investir esforços</h4>
          </div>
          <ul className="space-y-3 text-sm text-foreground/90 leading-relaxed">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">1</span>
              <span>
                <span className="font-semibold text-foreground">Blindar clientes OURO e DIAMANTE:</span>{" "}
                Estruturar programa de relacionamento com benefícios exclusivos (taxas, liquidez, antecipação), além de contato proativo para redução de churn (perda/cancelamento de clientes), aumento de retenção e constante crescimento do TPV.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">2</span>
              <span>
                <span className="font-semibold text-foreground">Reativar inativos:</span>{" "}
                Reativação de base inativa: executar campanhas direcionadas para clientes que estão ativos, porém que zeraram o TPV nos últimos meses, com incentivos como taxa promocional, ou isenção temporária.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">3</span>
              <span>
                <span className="font-semibold text-foreground">Diversificação de segmentos:</span>{" "}
                Há muita concentração no segmento líder. Acelerar a aquisição e ativação nos 2º e 3º segmentos que tem alto potencial, mas estão com baixa penetração.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">4</span>
              <span>
                <span className="font-semibold text-foreground">Expansão geográfica:</span>{" "}
                Checar junto a gestão comercial a possibilidade de atuação e campanhas regionais nas 9 UFs com menor presença, priorizando crescimento orgânico.
              </span>
            </li>
            {insights.propBaixaPerf.length > 0 && (
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">5</span>
                <span>
                  <span className="font-semibold text-foreground">Desenvolvimento de executivos/proprietários:</span>{" "}
                  estruturar plano de capacitação para os 8 responsáveis com performance abaixo de 5% do TPV, com acompanhamento, metas claras e mentoria baseada nos top performers.
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Card IA: anomalias, churn e projeção */}
      <div className="mt-5 rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-display text-lg font-bold">Análise com IA</h4>
              <p className="text-xs text-muted-foreground">
                Anomalias, crescimento incomum, churn e projeção de receita
              </p>
            </div>
          </div>
          <button
            onClick={runAnaliseIA}
            disabled={iaLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {iaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {iaLoading ? "Analisando..." : iaResult ? "Reanalisar" : "Executar análise IA"}
          </button>
        </div>

        {!iaResult && !iaLoading && (
          <p className="text-sm text-muted-foreground">
            Clique em <span className="font-semibold text-foreground">Executar análise IA</span> para gerar insights automáticos
            sobre os filtros atuais: detecção de anomalias, padrões de crescimento, sinais de churn e projeção de receita.
          </p>
        )}

        {iaLoading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Processando análise estratégica com IA...
          </div>
        )}

        {iaResult && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Anomalias */}
            <div className="rounded-lg border border-border/50 bg-background/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-chart-orange" />
                <h5 className="text-sm font-semibold">Anomalias detectadas</h5>
              </div>
              {iaResult.anomalias.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma anomalia relevante.</p>
              ) : (
                <ul className="space-y-2">
                  {iaResult.anomalias.map((a, i) => (
                    <li key={i} className="text-xs text-foreground/90">
                      <span className="font-mono mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                        {a.periodo}
                      </span>
                      <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] uppercase ${
                        a.severidade === "alta" ? "bg-destructive/20 text-destructive" :
                        a.severidade === "media" ? "bg-chart-orange/20 text-chart-orange" :
                        "bg-muted text-muted-foreground"
                      }`}>{a.tipo} · {a.severidade}</span>
                      {a.descricao}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Crescimento incomum */}
            <div className="rounded-lg border border-border/50 bg-background/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-chart-green" />
                <h5 className="text-sm font-semibold">Crescimento incomum</h5>
              </div>
              {iaResult.crescimento_incomum.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem destaques.</p>
              ) : (
                <ul className="space-y-2">
                  {iaResult.crescimento_incomum.map((c, i) => (
                    <li key={i} className="text-xs text-foreground/90">
                      <span className="font-semibold text-foreground">{c.nome}</span>
                      <span className="ml-1 text-muted-foreground">({c.dimensao})</span>
                      <span className="block">{c.descricao}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Quedas TPV */}
            <div className="rounded-lg border border-border/50 bg-background/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <h5 className="text-sm font-semibold">Quedas de TPV</h5>
              </div>
              {iaResult.quedas_tpv.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem quedas relevantes.</p>
              ) : (
                <ul className="space-y-3">
                  {iaResult.quedas_tpv.map((q, i) => (
                    <li key={i} className="text-xs text-foreground/90">
                      <div className="font-semibold text-foreground">{q.contexto}</div>
                      <div className="text-muted-foreground">Impacto: {q.impacto}</div>
                      <div className="mt-1">→ {q.recomendacao}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Risco de Churn */}
            <div className="rounded-lg border border-border/50 bg-background/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-chart-magenta" />
                <h5 className="text-sm font-semibold">Risco de churn</h5>
                <span className={`ml-auto rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  iaResult.risco_churn.nivel === "alto" ? "bg-destructive/20 text-destructive" :
                  iaResult.risco_churn.nivel === "medio" ? "bg-chart-orange/20 text-chart-orange" :
                  "bg-chart-green/20 text-chart-green"
                }`}>{iaResult.risco_churn.nivel}</span>
              </div>
              <p className="text-xs text-foreground/90">{iaResult.risco_churn.descricao}</p>
              {iaResult.risco_churn.clientes_em_risco && iaResult.risco_churn.clientes_em_risco.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {iaResult.risco_churn.clientes_em_risco.map((c, i) => (
                    <span key={i} className="rounded bg-muted px-2 py-0.5 text-[10px]">{c}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Projeção de Receita */}
            <div className="lg:col-span-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h5 className="text-sm font-semibold">Projeção de receita (3 meses)</h5>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {iaResult.projecao_receita.proximos_meses.map((m, i) => (
                  <div key={i} className="rounded-lg bg-background/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.periodo}</div>
                    <div className="num-display mt-1 text-sm font-bold text-foreground">{formatBRL(m.base)}</div>
                    <div className="mt-1 flex justify-between text-[10px]">
                      <span className="text-chart-green">↑ {formatBRL(m.otimista)}</span>
                      <span className="text-destructive">↓ {formatBRL(m.pessimista)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{iaResult.projecao_receita.comentario}</p>
            </div>

            {/* Resumo executivo IA */}
            <div className="lg:col-span-2 rounded-lg border border-border/50 bg-background/40 p-4">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Resumo IA</div>
              <p className="text-sm text-foreground/90 leading-relaxed">{iaResult.resumo_executivo}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-4">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Resumo executivo: </span>
          O negócio é altamente concentrado — poucos clientes, segmentos e regiões respondem pela maior parte do TPV.
          A estratégia ideal combina <span className="font-semibold text-foreground">defesa</span> (proteger os grandes) com{" "}
          <span className="font-semibold text-foreground">ataque</span> (expandir base, reativar inativos e diversificar regiões).
          Pequenos ganhos no topo da pirâmide têm impacto desproporcionalmente maior do que captar muitos pequenos.
        </p>
      </div>
    </div>
  );
}
