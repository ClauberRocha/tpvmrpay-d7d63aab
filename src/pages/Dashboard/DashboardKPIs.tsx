import { Receipt, Ticket, Users, Wallet } from "lucide-react";
import { useMemo } from "react";

import { useDashboardFilter } from "./DashboardFilterContext";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { dimensionRanking, totalsFiltered, tpv } from "@/data/tpv";

export function DashboardKPIs() {
  const { filtros } = useDashboardFilter();
  const mesesAno = typeof filtros.ano === "number" ? (tpv.meta.mesesPorAno[String(filtros.ano)] ?? []) : [];
  const mesesEfetivos = filtros.meses.length > 0 ? filtros.meses : mesesAno;

  const kpis = useMemo(() => {
    const { tpv: tpvAtual, tx: txAtual } = totalsFiltered(filtros);

    // Clientes ativos: contagem de clientes com TPV no período filtrado
    const clientes = dimensionRanking(tpv.clienteTs, filtros).length;
    const ufsAtivas = dimensionRanking(tpv.ufTs, { ...filtros, uf: "todos" }).length;

    // Comparação MoM (mês anterior) — usa último mês do período como referência
    let tpvAnterior: number | undefined;
    let txAnterior: number | undefined;
    let clientesAnt: number | undefined;
    if (typeof filtros.ano === "number" && mesesEfetivos.length > 0) {
      const ultimoMes = mesesEfetivos[mesesEfetivos.length - 1];
      if (ultimoMes !== undefined) {
        let mesPrev = ultimoMes - 1;
        let anoPrev = filtros.ano;
        if (mesPrev < 1) {
          mesPrev = 12;
          anoPrev = filtros.ano - 1;
        }
        if (anoPrev === filtros.ano || tpv.meta.anos.includes(anoPrev)) {
          const fPrev: Filtros = { ano: anoPrev, meses: [mesPrev], segmento: filtros.segmento, uf: filtros.uf };
          const totPrev = totalsFiltered(fPrev);
          tpvAnterior = totPrev.tpv;
          txAnterior = totPrev.tx;
          clientesAnt = dimensionRanking(tpv.clienteTs, fPrev).length;
        }
      }
    }

    return { tpvAtual, tpvAnterior, txAtual, txAnterior, clientes, clientesAnt, ufsAtivas };
  }, [filtros, mesesEfetivos]);

  return (
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
  );
}
