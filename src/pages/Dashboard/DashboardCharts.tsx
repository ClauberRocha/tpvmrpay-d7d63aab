
import { ComparativoAnual } from "./components/charts/ComparativoAnual";
import { RankBars } from "./components/charts/RankBars";
import { ShareSegmento } from "./components/charts/ShareSegmento";
import { TendenciaTemporal } from "./components/charts/TendenciaTemporal";
import { useDashboardFilter } from "./DashboardFilterContext";

const CATEGORIA_COLOR_MAP = {
  Diamante: "#3070cd",
  Ouro: "hsl(45 95% 55%)",
  Prata: "hsl(220 10% 75%)",
  Bronze: "hsl(25 65% 50%)",
};

export function DashboardCharts() {
  const { filtros } = useDashboardFilter();
  return (
    <>
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
    </>
  );
}
