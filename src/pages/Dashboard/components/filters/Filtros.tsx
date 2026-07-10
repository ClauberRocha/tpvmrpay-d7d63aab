import { tpv, type Periodo } from "@/data/tpv";
import { cn } from "@/lib/utils";

const MESES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface FiltrosProps {
  ano: Periodo;
  setAno: (a: Periodo) => void;
  meses: number[];
  setMeses: (m: number[]) => void;
  segmento: string;
  setSegmento: (s: string) => void;
  uf: string;
  setUf: (u: string) => void;
}

export function Filtros({ ano, setAno, meses, setMeses, segmento, setSegmento, uf, setUf }: FiltrosProps) {
  const anos: Periodo[] = ["todos", ...tpv.meta.anos];

  // Meses disponíveis (união se "todos os anos")
  const mesesDisponiveis: number[] = (() => {
    if (ano === "todos") {
      const set = new Set<number>();
      Object.values(tpv.meta.mesesPorAno).forEach((arr) => arr.forEach((m) => set.add(m)));
      return Array.from(set).sort((a, b) => a - b);
    }
    return tpv.meta.mesesPorAno[String(ano)] ?? [];
  })();

  const todosMesesSelecionados = meses.length === 0 || meses.length === mesesDisponiveis.length;

  const toggleMes = (m: number, additive: boolean) => {
    if (additive) {
      // Ctrl/Shift/Cmd-clique = seleção múltipla acumulativa
      if (meses.includes(m)) setMeses(meses.filter((x) => x !== m));
      else setMeses([...meses, m].sort((a, b) => a - b));
      return;
    }
    // Clique simples = seleção única (substitui)
    if (meses.length === 1 && meses[0] === m) setMeses([]); // reclicar = "Todos"
    else setMeses([m]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-xl border border-border/60 bg-card p-1">
          {anos.map((a) => (
            <button
              key={String(a)}
              onClick={() => {
                setAno(a);
                setMeses([]); // reset meses ao trocar ano
              }}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all",
                ano === a
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {a === "todos" ? "Todos os anos" : a}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <SelectChip label="Segmento" value={segmento} onChange={setSegmento} options={tpv.meta.segmentos} />
          <SelectChip label="UF" value={uf} onChange={setUf} options={tpv.meta.ufs} />
        </div>
      </div>

      {/* Filtro de meses */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-2">
        <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Meses
        </span>
        <button
          onClick={() => {
            setAno("todos");
            setMeses([]);
          }}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            ano === "todos" && todosMesesSelecionados
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Mostrar todos os meses de todos os anos"
        >
          Todos
        </button>
        <div className="h-4 w-px bg-border/60" />
        {mesesDisponiveis.map((m) => {
          const ativo = meses.includes(m);
          return (
            <button
              key={m}
              onClick={(e) => toggleMes(m, e.shiftKey || e.ctrlKey || e.metaKey)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors min-w-[40px]",
                ativo
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Clique para selecionar apenas este mês · Shift/Ctrl+clique para somar com outro mês"
            >
              {MESES_LBL[m - 1]}
            </button>
          );
        })}
        {meses.length > 0 && meses.length !== mesesDisponiveis.length && (
          <span className="ml-auto pr-2 text-[10px] text-muted-foreground">
            {meses.length} {meses.length === 1 ? "mês" : "meses"} selecionado{meses.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function SelectChip({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="group relative inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent pr-4 font-semibold text-foreground outline-none cursor-pointer"
      >
        <option value="todos" className="bg-card">Todos</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-card">{o}</option>
        ))}
      </select>
    </label>
  );
}
