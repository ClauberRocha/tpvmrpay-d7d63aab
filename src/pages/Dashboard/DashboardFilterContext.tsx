import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { tpv, type Filtros as FiltrosType, type Periodo } from "@/data/tpv";

interface DashboardFilterContextType {
  ano: Periodo;
  setAno: (ano: Periodo) => void;
  meses: number[];
  setMeses: (meses: number[]) => void;
  segmento: string;
  setSegmento: (segmento: string) => void;
  uf: string;
  setUf: (uf: string) => void;
  filtros: FiltrosType;
}

const DashboardFilterContext = createContext<DashboardFilterContextType | undefined>(undefined);

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

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [ano, setAno] = useState<Periodo>(tpv.meta.anos[tpv.meta.anos.length - 1] ?? "todos");
  const [meses, setMeses] = useState<number[]>([]);
  const [segmento, setSegmento] = useState("todos");
  const [uf, setUf] = useState("todos");

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
    localStorage.setItem("tpv-filtros", JSON.stringify(filtros));
  }, [filtros]);

  return (
    <DashboardFilterContext.Provider value={{
      ano, setAno,
      meses, setMeses,
      segmento, setSegmento,
      uf, setUf,
      filtros,
    }}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilter() {
  const context = useContext(DashboardFilterContext);
  if (!context) {
    throw new Error("useDashboardFilter must be used within a DashboardFilterProvider");
  }
  return context;
}
