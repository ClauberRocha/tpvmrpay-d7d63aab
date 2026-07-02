import { useDashboardFilter } from "./DashboardFilterContext";

import { MapaUF } from "@/components/dashboard/MapaUF";
import { RankBars } from "@/components/dashboard/RankBars";

export function DashboardMaps() {
  const { filtros } = useDashboardFilter();
  return (
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
  );
}
