import { Activity, BarChart3, Building2, MapPin, Receipt, Ticket, Users, Wallet, LogOut, User, Settings, ClipboardList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import mrpayLogo from "@/assets/mrpay-logo.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Filtros } from "@/components/dashboard/Filtros";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TendenciaTemporal } from "@/components/dashboard/TendenciaTemporal";
import { ShareSegmento } from "@/components/dashboard/ShareSegmento";
import { RankBars } from "@/components/dashboard/RankBars";
import { MapaUF } from "@/components/dashboard/MapaUF";
import { TopClientes } from "@/components/dashboard/TopClientes";
import { ClientesInativos } from "@/components/dashboard/ClientesInativos";
import { AnaliseInsights } from "@/components/dashboard/AnaliseInsights";
import { useAuth } from "@/components/AuthProvider";

import { ComparativoAnual } from "@/components/dashboard/ComparativoAnual";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

import {
  dimensionRanking, totalsFiltered, tpv,
  type Filtros as FiltrosType, type Periodo,
} from "@/data/tpv";

const MESES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const mesesDisponiveisPara = (ano: Periodo) => {
  if (ano === "todos") {
    return Array.from(new Set(Object.values(tpv.meta.mesesPorAno).flat())).sort((a, b) => a - b);
  }
  return tpv.meta.mesesPorAno[String(ano)] ?? [];
};

const normalizarAno = (value: unknown): Periodo => {
  if (value === "todos") return "todos";
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && tpv.meta.anos.includes(n)
    ? n
    : tpv.meta.anos[tpv.meta.anos.length - 1] ?? "todos";
};

const normalizarFiltros = (value: Partial<FiltrosType> | null | undefined): FiltrosType => {
  const ano = normalizarAno(value?.ano);
  const mesesValidos = new Set(mesesDisponiveisPara(ano));
  const meses = Array.isArray(value?.meses)
    ? Array.from(new Set(value.meses.map(Number).filter((m) => Number.isInteger(m) && mesesValidos.has(m)))).sort((a, b) => a - b)
    : [];
  const segmento = typeof value?.segmento === "string" && (value.segmento === "todos" || tpv.meta.segmentos.includes(value.segmento))
    ? value.segmento
    : "todos";
  const uf = typeof value?.uf === "string" && (value.uf === "todos" || tpv.meta.ufs.includes(value.uf))
    ? value.uf
    : "todos";
  return { ano, meses, segmento, uf };
};

const CATEGORIA_COLOR_MAP = {
  Diamante: "#3070cd",
  Ouro: "hsl(45 95% 55%)",
  Prata: "hsl(220 10% 75%)",
  Bronze: "hsl(25 65% 50%)",
};

const Index = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [lastLogin, setLastLogin] = useState<{ date: string; ua: string } | null>(null);
  const [ano, setAno] = useState<Periodo>(tpv.meta.anos[tpv.meta.anos.length - 1] ?? "todos");

  const handleSignOut = async () => {
    // Auth removed — no-op. Kept to preserve existing UI wiring.
    // TODO: Remove sign-out button from the header once auth cleanup is finalized.
    navigate("/");
  };
  const [meses, setMeses] = useState<number[]>([]);
  const [segmento, setSegmento] = useState("todos");
  const [uf, setUf] = useState("todos");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
  }, []);

  const filtros = useMemo<FiltrosType>(() => normalizarFiltros({
    ano,
    meses,
    segmento,
    uf,
  }), [ano, JSON.stringify(meses), segmento, uf]);

  useEffect(() => {
    const saved = localStorage.getItem("tpv-filtros");
    if (saved) {
      try {
        const parsed = normalizarFiltros(JSON.parse(saved));
        setAno(parsed.ano);
        setMeses(parsed.meses);
        setSegmento(parsed.segmento);
        setUf(parsed.uf);
      } catch {
        localStorage.removeItem("tpv-filtros");
      }
    }
  }, []);

  useEffect(() => {
    const fetchLastLogin = async () => {
      if (!user?.email) return;
      const { data } = await supabase
        .from("login_attempts")
        .select("created_at, user_agent")
        .eq("email", user.email)
        .eq("success", true)
        .order("created_at", { ascending: false })
        .limit(2) // Pega os dois últimos para garantir que vemos a sessão *anterior* à atual se necessário, 
        // ou apenas o mais recente se quisermos o "atual" de agora
        .single();
      
      // Vamos buscar o segundo registro (o anterior à sessão atual) se existir
      const { data: previous } = await supabase
        .from("login_attempts")
        .select("created_at, user_agent")
        .eq("email", user.email)
        .eq("success", true)
        .order("created_at", { ascending: false })
        .range(1, 1)
        .maybeSingle();

      if (previous) {
        setLastLogin({
          date: new Date(previous.created_at).toLocaleString("pt-BR"),
          ua: previous.user_agent
        });
      }
    };
    fetchLastLogin();
  }, [user]);

  useEffect(() => {
    localStorage.setItem("tpv-filtros", JSON.stringify(filtros));
  }, [filtros]);

  // Meses do ano selecionado para textos
  const mesesAno = typeof ano === "number" ? (tpv.meta.mesesPorAno[String(ano)] ?? []) : [];
  const mesesEfetivos = meses.length > 0 ? meses : mesesAno;
  const periodoParcial =
    typeof ano === "number" &&
    mesesEfetivos.length > 0 &&
    mesesEfetivos.length < 12;

  const kpis = useMemo(() => {
    const { tpv: tpvAtual, tx: txAtual } = totalsFiltered(filtros);

    // Clientes ativos: contagem de clientes com TPV no período filtrado
    const clientes = dimensionRanking(tpv.clienteTs, filtros).length;
    const ufsAtivas = dimensionRanking(tpv.ufTs, { ...filtros, uf: "todos" }).length;

    // Comparação MoM (mês anterior) — usa último mês do período como referência
    let tpvAnterior: number | undefined;
    let txAnterior: number | undefined;
    let clientesAnt: number | undefined;
    if (typeof ano === "number" && mesesEfetivos.length > 0) {
      const ultimoMes = mesesEfetivos[mesesEfetivos.length - 1];
      let mesPrev = ultimoMes - 1;
      let anoPrev = ano;
      if (mesPrev < 1) {
        mesPrev = 12;
        anoPrev = ano - 1;
      }
      if (anoPrev === ano || tpv.meta.anos.includes(anoPrev)) {
        const fPrev: FiltrosType = { ano: anoPrev, meses: [mesPrev], segmento, uf };
        const totPrev = totalsFiltered(fPrev);
        tpvAnterior = totPrev.tpv;
        txAnterior = totPrev.tx;
        clientesAnt = dimensionRanking(tpv.clienteTs, fPrev).length;
      }
    }

    return { tpvAtual, tpvAnterior, txAtual, txAnterior, clientes, clientesAnt, ufsAtivas };
  }, [filtros, ano, segmento, uf, mesesEfetivos]);

  const periodoLabel = (() => {
    if (ano === "todos") {
      if (meses.length > 0) {
        return `Histórico · ${meses.map((m) => MESES_LBL[m - 1]).join(", ")}`;
      }
      return "Histórico completo";
    }
    if (meses.length > 0) {
      return `${ano} · ${meses.map((m) => MESES_LBL[m - 1]).join(", ")}`;
    }
    if (periodoParcial) {
      return `Ano ${ano} · ${MESES_LBL[mesesAno[0] - 1]}–${MESES_LBL[mesesAno[mesesAno.length - 1] - 1]} (parcial)`;
    }
    return `Ano ${ano}`;
  })();

  const lastUpdate = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10 lg:py-10">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <img src={mrpayLogo} alt="Mr Pay" className="h-12 w-auto lg:h-14" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">
                  <span className="text-primary">TPV</span>
                </h1>
              </div>
              <div className="flex flex-col">
                <p className="mt-1 text-sm text-white font-medium">
                  Dashboard Executivo
                </p>
                {user && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-[14px] text-[#F9C730] px-2 py-0.5 rounded-full w-fit">
                    <User className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                )}
                {lastLogin && (
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Último acesso: <span className="text-gray-300">{lastLogin.date}</span>
                    <span className="opacity-40">({lastLogin.ua.split(') ')[0].split(' (')[0]})</span>
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-4 w-4 text-primary" />
              Atualizado em {lastUpdate}
            </div>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/users")}
                disabled={role !== "admin"}
                className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
              >
                <Settings className="h-4 w-4" />
                Gerenciar Usuários
              </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/logs")}
                disabled={role !== "admin"}
                className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
              >
                <ClipboardList className="h-4 w-4" />
                Logs
              </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/audit")}
                disabled={role !== "admin"}
                className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
              >
                <ShieldCheck className="h-4 w-4" />
                Auditoria
              </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </header>

        {/* Filtros */}
        <div className="mb-8">
          <Filtros
            ano={ano} setAno={setAno}
            meses={meses} setMeses={setMeses}
            segmento={segmento} setSegmento={setSegmento}
            uf={uf} setUf={setUf}
          />
        </div>

        {/* KPIs */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="TPV total"
            value={kpis.tpvAtual}
            previous={kpis.tpvAnterior}
            icon={Wallet}
            accent="yellow"
            comparisonLabel="vs. mês anterior"
            subtitle={kpis.tpvAnterior === undefined ? "Selecione um mês para comparar" : undefined}
          />
          <KpiCard
            label="Total de Transações"
            value={kpis.txAtual}
            previous={kpis.txAnterior}
            icon={Receipt}
            format="number"
            accent="cyan"
            comparisonLabel="vs. mês anterior"
            subtitle={kpis.txAnterior === undefined ? "Selecione um mês para comparar" : undefined}
          />
          <KpiCard
            label="Ticket Médio"
            value={kpis.txAtual > 0 ? kpis.tpvAtual / kpis.txAtual : 0}
            previous={kpis.tpvAnterior !== undefined && kpis.txAnterior !== undefined && kpis.txAnterior > 0 ? kpis.tpvAnterior / kpis.txAnterior : undefined}
            icon={Ticket}
            accent="violet"
            comparisonLabel="vs. mês anterior"
            subtitle={kpis.txAnterior === undefined ? "TPV ÷ nº transações" : "TPV ÷ nº transações"}
          />
          <KpiCard
            label="Clientes ativos"
            value={kpis.clientes}
            previous={kpis.clientesAnt}
            icon={Users}
            format="number"
            accent="magenta"
            comparisonLabel="vs. mês anterior"
            subtitle={kpis.clientesAnt === undefined ? "Selecione um mês para comparar" : undefined}
          />
        </section>


        {/* Linha 1: Tendência + Share */}
        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TendenciaTemporal filtros={filtros} />
          </div>
          <ShareSegmento filtros={filtros} />
        </section>


        {/* Linha 2: Categorias + Proprietários */}
        <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RankBars
            filtros={filtros}
            source="categoriaTs"
            title="Desempenho por Categoria"
            subtitle="TPV por nível de categoria do cliente"
            color="hsl(var(--accent-cyan))"
            colorMap={CATEGORIA_COLOR_MAP}
          />
          <RankBars
            filtros={filtros}
            source="proprietarioTs"
            title="Captação por Proprietário"
            subtitle="TPV consolidado por dono da conta"
            color="hsl(var(--accent-magenta))"
            limit={10}
          />
        </section>

        {/* Comparativo anual 2025 vs 2026 */}
        <section className="mb-6">
          <ComparativoAnual />
        </section>


        {/* Linha 3: UF heatmap + Municípios */}
        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,1fr]">
          <MapaUF filtros={filtros} />
          <RankBars
            filtros={filtros}
            source="municipioTs"
            title="TPV por Municípios"
            subtitle="Comparação de vendas por cidade"
            color="#3BABCC"
            limit={10}
          />
        </section>

        {/* Linha 4: Top Clientes full width */}
        <section className="mb-6">
          <TopClientes filtros={filtros} />
        </section>

        {/* Linha 5: Matriz de Clientes Inativos */}
        <section className="mb-6">
          <ClientesInativos filtros={filtros} />
        </section>

        {/* Linha 6: Análise estratégica */}
        <section className="mb-10">
          <AnaliseInsights filtros={filtros} />
        </section>

        <footer className="border-t border-border/40 pt-6 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              Mr Pagamentos · Painel TPV interno
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {kpis.ufsAtivas} UFs ativas
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {kpis.clientes.toLocaleString("pt-BR")} clientes no período
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

export default Index;
