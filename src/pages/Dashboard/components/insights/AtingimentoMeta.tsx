import { Target, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { useState, useMemo } from "react";

import { DashboardService } from "../../services/DashboardService";

import { formatBRL } from "@/data/tpv";
import type { Filtros } from "@/data/tpv";

export function AtingimentoMeta({ filtros }: { filtros: Filtros }) {
  const [activeTab, setActiveTab] = useState<"diario" | "semanal" | "mensal" | "anual">("mensal");

  const metaData = useMemo(() => {
    return DashboardService.getAtingimentoMeta(filtros);
  }, [filtros]);

  const { pct, meta, realizado, faltam, semaforo, projections } = metaData;

  // Selected scale settings
  const scaleInfo = useMemo(() => {
    const p = projections[activeTab];
    const scalePct = p.meta > 0 ? (p.realizado / p.meta) * 100 : 0;
    const scaleFalta = Math.max(0, p.meta - p.realizado);

    let scaleSemaforo: "verde" | "amarelo" | "vermelho" = "vermelho";
    if (scalePct >= 95) {
      scaleSemaforo = "verde";
    } else if (scalePct >= 75) {
      scaleSemaforo = "amarelo";
    }

    return {
      metaVal: p.meta,
      realizadoVal: p.realizado,
      pctVal: scalePct,
      faltaVal: scaleFalta,
      semaforoVal: scaleSemaforo,
    };
  }, [projections, activeTab]);

  const semaforoLabels = {
    verde: { color: "bg-success shadow-success/40", text: "🟢 Meta Atingida / Excelente" },
    amarelo: { color: "bg-chart-orange shadow-chart-orange/40", text: "🟡 Meta em Rota / Alerta" },
    vermelho: { color: "bg-destructive shadow-destructive/40", text: "🔴 Desvio Crítico / Risco" },
  };

  const currentSemaforo = semaforoLabels[scaleInfo.semaforoVal];

  // Projections insights text
  const projText = useMemo(() => {
    const anualRealizadoProj = projections.anual.realizado;
    const anualMeta = projections.anual.meta;
    const anualPct = (anualRealizadoProj / anualMeta) * 100;

    if (anualPct >= 100) {
      return `Projeção otimista: No ritmo atual, estimamos que o faturamento anual consolidado fechará em ${formatBRL(anualRealizadoProj)} (${anualPct.toFixed(0)}% da meta de ${formatBRL(anualMeta)}).`;
    }
    return `Alerta de Performance: No ritmo atual, a estimativa indica que fecharemos o ano em ${formatBRL(anualRealizadoProj)} (${anualPct.toFixed(0)}% da meta anual de ${formatBRL(anualMeta)}). Faltam R$ ${formatBRL(anualMeta - anualRealizadoProj)} para o atingimento absoluto da meta anual.`;
  }, [projections]);

  return (
    <div className="panel bg-gradient-to-br from-card to-card/90">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Atingimento de Metas de TPV</h3>
            <p className="text-xs text-muted-foreground">Monitoramento executivo de metas diárias, semanais, mensais e consolidadas</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center rounded-lg bg-muted/30 p-1 border border-border/40">
          {(["diario", "semanal", "mensal", "anual"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "diario" ? "Diário" : tab === "semanal" ? "Semanal" : tab === "mensal" ? "Mensal" : "Anual"}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Goal Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Core details */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/10 p-5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Período de Referência ({activeTab})
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="num-display text-3xl font-extrabold text-foreground">
                {scaleInfo.pctVal.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">da meta concluída</span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Meta {activeTab === "diario" ? "Diária" : activeTab === "semanal" ? "Semanal" : activeTab === "mensal" ? "Mensal" : "Anual"}:</span>
              <span className="font-semibold text-foreground">{formatBRL(scaleInfo.metaVal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Realizado:</span>
              <span className="font-semibold text-primary">{formatBRL(scaleInfo.realizadoVal)}</span>
            </div>
            {scaleInfo.faltaVal > 0 ? (
              <div className="flex items-center justify-between text-xs border-t border-border/30 pt-2 text-destructive">
                <span>Diferença / Faltam:</span>
                <span className="font-bold">{formatBRL(scaleInfo.faltaVal)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs border-t border-border/30 pt-2 text-success font-bold">
                <span>Meta Superada!</span>
                <span>+{formatBRL(Math.abs(scaleInfo.metaVal - scaleInfo.realizadoVal))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Target Progress Bar & Semaphore */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/10 p-5 md:col-span-2">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-foreground">Indicador de Status Executivo</span>
              {/* Traffic Light Semaphore */}
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full animate-pulse shadow-sm ${currentSemaforo.color}`} />
                <span className="text-[11px] font-bold text-foreground">{currentSemaforo.text}</span>
              </div>
            </div>

            {/* Target Bar */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>0%</span>
                <span className="font-semibold text-foreground">{scaleInfo.pctVal.toFixed(0)}% Realizado</span>
                <span>100% Target</span>
              </div>
              <div className="h-4 w-full rounded-full bg-border/60 relative overflow-hidden border border-border/20">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${
                    scaleInfo.semaforoVal === "verde" ? "from-success to-chart-green" :
                    scaleInfo.semaforoVal === "amarelo" ? "from-chart-orange to-yellow-500" :
                    "from-destructive to-red-500"
                  }`}
                  style={{ width: `${Math.min(100, scaleInfo.pctVal)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Forecasting Projections banner */}
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-foreground">Projeção Baseada em Tendência: </span>
              {projText}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Nota de Planejamento Financeiro: </span>
          As metas acima têm como base o TPV mensal alvo estabelecido para o ano fiscal corrente (R$ 350.000,00 por mês).
          Em caso de sazonalidade ou alteração orçamentária, os parâmetros do `DashboardService` devem ser atualizados.
        </p>
      </div>
    </div>
  );
}
