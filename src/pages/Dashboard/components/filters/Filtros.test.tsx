import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";

import { Filtros } from "./Filtros";
import type { Periodo } from "@/data/tpv";

function Harness({
  initialAno = 2026 as Periodo,
  initialMeses = [] as number[],
  onChange,
}: {
  initialAno?: Periodo;
  initialMeses?: number[];
  onChange?: (meses: number[], ano: Periodo) => void;
}) {
  const [ano, setAno] = useState<Periodo>(initialAno);
  const [meses, setMeses] = useState<number[]>(initialMeses);
  const [segmento, setSegmento] = useState("todos");
  const [uf, setUf] = useState("todos");

  const update = (m: number[], a: Periodo = ano) => {
    setMeses(m);
    onChange?.(m, a);
  };

  return (
    <Filtros
      ano={ano}
      setAno={(a) => {
        setAno(a);
        onChange?.(meses, a);
      }}
      meses={meses}
      setMeses={update}
      segmento={segmento}
      setSegmento={setSegmento}
      uf={uf}
      setUf={setUf}
    />
  );
}

describe("Filtros — comportamento do filtro de meses", () => {
  it("clique em 'Todos' zera meses e volta o ano para 'todos'", () => {
    const spy = vi.fn();
    render(<Harness initialAno={2026} initialMeses={[3]} onChange={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    // último onChange: meses=[], ano="todos"
    const last = spy.mock.calls.at(-1);
    expect(last?.[0]).toEqual([]);
    expect(last?.[1]).toBe("todos");
  });

  it("clique simples em um mês substitui a seleção anterior (não soma)", () => {
    const spy = vi.fn();
    render(<Harness initialAno={2026} initialMeses={[6]} onChange={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Mar" }));
    expect(spy).toHaveBeenLastCalledWith([3], 2026);
  });

  it("clique repetido no mesmo mês desseleciona (volta ao equivalente de 'Todos')", () => {
    const spy = vi.fn();
    render(<Harness initialAno={2026} initialMeses={[3]} onChange={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Mar" }));
    expect(spy).toHaveBeenLastCalledWith([], 2026);
  });

  it("shift+clique em outro mês acumula a seleção (multi-seleção)", () => {
    const spy = vi.fn();
    render(<Harness initialAno={2026} initialMeses={[3]} onChange={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Jun" }), { shiftKey: true });
    expect(spy).toHaveBeenLastCalledWith([3, 6], 2026);
  });

  it("ctrl+clique em um mês já selecionado remove apenas ele da multi-seleção", () => {
    const spy = vi.fn();
    render(<Harness initialAno={2026} initialMeses={[3, 6]} onChange={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Mar" }), { ctrlKey: true });
    expect(spy).toHaveBeenLastCalledWith([6], 2026);
  });

  it("mostra contagem correta quando há multi-seleção parcial", () => {
    render(<Harness initialAno={2026} initialMeses={[3, 6]} />);
    expect(screen.getByText(/2 meses selecionados/i)).toBeInTheDocument();
  });
});
