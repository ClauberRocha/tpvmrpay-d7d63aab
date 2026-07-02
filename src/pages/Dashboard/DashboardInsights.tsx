
import { AnaliseInsights } from "./components/insights/AnaliseInsights";
import { ClientesInativos } from "./components/insights/ClientesInativos";
import { TopClientes } from "./components/insights/TopClientes";
import { useDashboard } from "./hooks/useDashboard";

export function DashboardInsights() {
  const { filtros } = useDashboard();
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
