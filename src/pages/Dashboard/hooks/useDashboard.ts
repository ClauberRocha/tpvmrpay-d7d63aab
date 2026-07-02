import { useMemo } from "react";

import { useDashboardFilter } from "../DashboardFilterContext";
import { DashboardService } from "../services/DashboardService";

export function useDashboard() {
  const { filtros, ...filterActions } = useDashboardFilter();

  const kpis = useMemo(() => {
    return DashboardService.getKPIs(filtros);
  }, [filtros]);

  const topClientes = useMemo(() => {
    return DashboardService.getTopClientes(filtros);
  }, [filtros]);

  const inativos = useMemo(() => {
    return DashboardService.getClientesInativos(filtros);
  }, [filtros]);

  const mapaData = useMemo(() => {
    return DashboardService.getMapaUFData(filtros);
  }, [filtros]);

  const atingimento = useMemo(() => {
    return DashboardService.getAtingimentoMeta(filtros);
  }, [filtros]);

  const isLoading = false;
  const error = null;

  return {
    filtros,
    ...filterActions,
    kpis,
    topClientes,
    inativos,
    mapaData,
    atingimento,
    isLoading,
    error,
  };
}
export type UseDashboardReturn = ReturnType<typeof useDashboard>;
