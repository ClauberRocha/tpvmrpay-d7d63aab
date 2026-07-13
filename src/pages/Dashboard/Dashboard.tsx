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
import { dimensionRanking, isTpvLoaded, loadTpvData, tpv, TpvLoadError } from "@/data/tpv";
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
  const [error, setError] = useState<{ step: string; status: number; body: string } | null>(null);

  useEffect(() => { perfMark("dashboard_mount"); }, []);
  useEffect(() => { if (ready) perfMark("dashboard_ready"); }, [ready]);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    loadTpvData()
      .then(() => { if (!cancelled) setReady(true); })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof TpvLoadError) {
          setError({ step: e.step, status: e.status, body: e.body });
        } else {
          setError({ step: "unknown", status: 0, body: (e as Error)?.message ?? String(e) });
        }
      });
    return () => { cancelled = true; };
  }, [ready]);


  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-2xl space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
          <div>
            <p className="font-display text-lg font-semibold text-destructive">Não foi possível carregar os dados</p>
            <p className="text-sm text-muted-foreground">Detalhes abaixo para diagnóstico:</p>
          </div>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="font-medium text-muted-foreground">Etapa</dt>
            <dd className="font-mono">{error.step}</dd>
            <dt className="font-medium text-muted-foreground">Status</dt>
            <dd className="font-mono">{error.status || "—"}</dd>
          </dl>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Response body</p>
            <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 text-xs leading-relaxed">
{error.body || "(vazio)"}
            </pre>
          </div>
          <button
            onClick={() => { setError(null); window.location.reload(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Tentar novamente
          </button>
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
      <PerfPanel />
    </DashboardFilterProvider>
  );
};

export default Dashboard;
