import { Receipt, Ticket, Users, Wallet } from "lucide-react";

import { KpiCard } from "./components/cards/KpiCard";
import { useDashboard } from "./hooks/useDashboard";

export function DashboardKPIs() {
  const { kpis } = useDashboard();

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
        tooltip="Volume total transacionado (TPV) no período e filtros selecionados."
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
        tooltip="Quantidade acumulada de transações financeiras processadas."
      />
      <KpiCard
        label="Ticket Médio"
        value={kpis.txAtual > 0 ? kpis.tpvAtual / kpis.txAtual : 0}
        previous={kpis.tpvAnterior !== undefined && kpis.txAnterior !== undefined && kpis.txAnterior > 0 ? kpis.tpvAnterior / kpis.txAnterior : undefined}
        icon={Ticket}
        accent="violet"
        comparisonLabel="vs. mês anterior"
        subtitle={kpis.txAnterior === undefined ? "TPV ÷ nº transações" : "TPV ÷ nº transações"}
        tooltip="Valor médio das vendas calculado como TPV total dividido pela quantidade de transações."
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
        tooltip="Quantidade de clientes únicos com pelo menos uma transação no período filtrado."
      />
    </section>
  );
}
