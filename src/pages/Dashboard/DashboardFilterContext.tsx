import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
  /** Meses descartados na última normalização por incompatibilidade com o ano selecionado. */
  mesesDescartados: number[];
  /** Descarta o aviso de normalização (fecha o badge). */
  dismissAvisoNormalizacao: () => void;
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
  const [meses, setMesesInternal] = useState<number[]>([]);
  const [segmento, setSegmento] = useState("todos");
  const [uf, setUf] = useState("todos");
  const [mesesDescartados, setMesesDescartados] = useState<number[]>([]);
  const prevAnoRef = useRef(ano);

  // setMeses público: qualquer ação explícita do usuário limpa o aviso de normalização
  const setMeses = useCallback((next: number[]) => {
    setMesesInternal(next);
    setMesesDescartados([]);
  }, []);

  const dismissAvisoNormalizacao = useCallback(() => setMesesDescartados([]), []);

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
        setMesesInternal(parsed.meses);
        setSegmento(parsed.segmento);
        setUf(parsed.uf);
        prevAnoRef.current = parsed.ano;
      } catch {
        localStorage.removeItem("tpv-filtros");
      }
    }
  }, []);

  // Sincroniza meses ⇄ ano:
  // 1) Ao trocar o ano, descarta meses inexistentes e sinaliza quais foram removidos.
  // 2) Se todos os meses disponíveis estiverem selecionados, colapsa para [] (= "Todos").
  useEffect(() => {
    const disponiveis = mesesDisponiveisPara(ano);
    const setDisp = new Set(disponiveis);
    const interseccao = meses.filter((m) => setDisp.has(m));
    const colapsar = interseccao.length > 0 && interseccao.length === disponiveis.length;
    const proximo = colapsar ? [] : interseccao;
    const mudou =
      proximo.length !== meses.length || proximo.some((m, i) => m !== meses[i]);
    if (mudou) setMesesInternal(proximo);

    if (prevAnoRef.current !== ano) {
      const descartados = meses.filter((m) => !setDisp.has(m));
      if (descartados.length > 0) setMesesDescartados(descartados);
      prevAnoRef.current = ano;
    }
  }, [ano, meses]);

  // Auto-descartar aviso após 8s para não poluir a UI indefinidamente
  useEffect(() => {
    if (mesesDescartados.length === 0) return;
    const t = setTimeout(() => setMesesDescartados([]), 8000);
    return () => clearTimeout(t);
  }, [mesesDescartados]);

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
      mesesDescartados,
      dismissAvisoNormalizacao,
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
