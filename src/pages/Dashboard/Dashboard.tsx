import { BarChart3, Building2, Loader2, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Filtros } from "./components/filters/Filtros";
import { DashboardCharts } from "./DashboardCharts";
import { DashboardFilterProvider, useDashboardFilter } from "./DashboardFilterContext";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardInsights } from "./DashboardInsights";
import { DashboardKPIs } from "./DashboardKPIs";
import { DashboardMaps } from "./DashboardMaps";

import { PerfPanel } from "@/components/PerfPanel";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { dimensionRanking, isTpvLoaded, loadTpvData, tpv } from "@/data/tpv";
import { perfMark } from "@/lib/perfMetrics";

const DashboardContent = () => {
  const {
    filtros, ano, setAno, meses, setMeses, segmento, setSegmento, uf, setUf,
    mesesDescartados, dismissAvisoNormalizacao,
  } = useDashboardFilter();

  const activeClientsCount = useMemo(() => dimensionRanking(tpv.clienteTs, filtros).length, [filtros]);
  const activeUfsCount = useMemo(() => dimensionRanking(tpv.ufTs, { ...filtros, uf: "todos" }).length, [filtros]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10 lg:py-10">
        <DashboardHeader />

        <div className="mb-8">
          <Filtros
            ano={ano} setAno={setAno}
            meses={meses} setMeses={setMeses}
            segmento={segmento} setSegmento={setSegmento}
            uf={uf} setUf={setUf}
            mesesDescartados={mesesDescartados}
            onDismissAviso={dismissAvisoNormalizacao}
          />
        </div>

        <DashboardKPIs />
        <DashboardCharts />
        <DashboardMaps />
        <DashboardInsights />

        <footer className="border-t border-border/40 pt-6 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              Mr Pagamentos · Painel TPV interno
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {activeUfsCount} UFs ativas
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {activeClientsCount.toLocaleString("pt-BR")} clientes no período
              </div>
            </div>
          </div>
          <div className="mt-6 text-center text-[#F9C730] text-[12px] font-bold uppercase tracking-[0.2em] opacity-90">
            GERTEC/CONSULTI
          </div>
        </footer>
      </div>
      <ScrollToTopButton />
    </div>
  );
};

const Dashboard = () => {
  const [ready, setReady] = useState(isTpvLoaded());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    loadTpvData()
      .then(() => { if (!cancelled) setReady(true); })
      .catch((e) => { if (!cancelled) setError((e as Error)?.message ?? "Falha ao carregar dados"); });
    return () => { cancelled = true; };
  }, [ready]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md space-y-2">
          <p className="font-display text-lg font-semibold text-destructive">Não foi possível carregar os dados</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando dados protegidos…
        </div>
      </div>
    );
  }

  return (
    <DashboardFilterProvider>
      <DashboardContent />
    </DashboardFilterProvider>
  );
};

export default Dashboard;
