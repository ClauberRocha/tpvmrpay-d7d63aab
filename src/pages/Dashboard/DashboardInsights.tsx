import { useDashboardFilter } from "./DashboardFilterContext";

import { AnaliseInsights } from "@/components/dashboard/AnaliseInsights";
import { ClientesInativos } from "@/components/dashboard/ClientesInativos";
import { TopClientes } from "@/components/dashboard/TopClientes";

export function DashboardInsights() {
  const { filtros } = useDashboardFilter();
  return (
    <>
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
    </>
  );
}
