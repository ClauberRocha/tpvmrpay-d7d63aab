import { AlertCircle, MessageSquare, Mail, Play } from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "../../hooks/useDashboard";

import owners from "@/data/clienteProprietario.json";
import type { Filtros } from "@/data/tpv";

const ownersMap = owners as Record<string, string>;

const MESES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function ClientesInativos({ filtros }: { filtros: Filtros }) {
  const { inativos } = useDashboard();
  const { rows, mesesSel, totalClientes } = inativos;

  const periodoTxt = mesesSel.map((m) => MESES_LBL[m - 1]).join(", ");
  const totalmenteInativos = rows.filter((r) => r.faltas === mesesSel.length).length;
  const pctInativos = totalClientes > 0 ? (rows.length / totalClientes) * 100 : 0;

  const triggerWhatsApp = (name: string) => {
    toast.success(`Mensagem de WhatsApp copiada para enviar para ${name}!`, {
      description: "Olá! Sentimos sua falta transacionando conosco este mês...",
    });
  };

  const triggerEmail = (name: string) => {
    toast.success(`E-mail comercial de reativação enfileirado para ${name}!`);
  };

  const triggerCampanha = (name: string) => {
    toast.success(`Campanha de desconto/taxa reduzida criada para o cliente ${name}!`);
  };

  return (
    <div className="panel">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-chart-orange" />
            Matriz de Ociosidade & Risco de Churn (Inatividade)
          </h3>
          <p className="text-xs text-muted-foreground">
            Clientes inativos (R$ 0,00) por período, probabilidade de abandono e ações de reativação · {periodoTxt}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div><span className="font-semibold text-foreground">{rows.length}</span> com lacunas</div>
          <div><span className="font-semibold text-chart-orange">{totalmenteInativos}</span> totalmente inativos</div>
        </div>
      </div>

      <div className="max-h-[480px] overflow-auto rounded-xl border border-border/60">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <tr className="text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Cliente</th>
              <th className="px-4 py-3 text-left font-medium">Proprietário</th>
              {mesesSel.map((m) => (
                <th key={m} className="px-2 py-3 text-center font-medium w-12">
                  {MESES_LBL[m - 1]}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium w-16">Faltas</th>
              <th className="px-4 py-3 text-right font-medium w-28">Risco Churn</th>
              <th className="px-4 py-3 text-center font-medium w-36">Ações Rápidas</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={mesesSel.length + 5} className="px-4 py-8 text-center text-muted-foreground">
                  Todos os clientes transacionaram em todos os meses selecionados.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 align-middle">
                  <div className="font-semibold text-foreground line-clamp-1" title={r.name}>{r.name}</div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground align-middle text-xs">
                  {ownersMap[r.name] ? (
                    <span>{ownersMap[r.name]}</span>
                  ) : (
                    <span className="italic text-muted-foreground/60">não vinculado</span>
                  )}
                </td>
                {mesesSel.map((m) => (
                  <td key={m} className="px-2 py-2.5 text-center align-middle">
                    {r.meses[m] ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-success/15 text-success text-[10px] font-bold">✓</span>
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-destructive/15 text-destructive text-[10px] font-bold">0</span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right num-display font-semibold text-foreground align-middle text-xs">
                  {r.faltas}/{mesesSel.length}
                </td>
                <td className="px-4 py-2.5 text-center align-middle whitespace-nowrap">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold text-white ${
                    r.churnScore >= 80 ? "bg-destructive/15 border-destructive/20" :
                    r.churnScore >= 40 ? "bg-chart-orange/15 border-chart-orange/20" :
                    "bg-success/15 border-success/20"
                  }`}>
                    {r.churnScore}% Risco
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center align-middle whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => triggerWhatsApp(r.name)}
                      className="rounded-lg p-1.5 border border-border bg-background/50 hover:bg-success/10 hover:text-success text-muted-foreground transition-colors"
                      title="Chamar no WhatsApp"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => triggerEmail(r.name)}
                      className="rounded-lg p-1.5 border border-border bg-background/50 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                      title="Enviar E-mail"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => triggerCampanha(r.name)}
                      className="rounded-lg p-1.5 border border-border bg-background/50 hover:bg-chart-violet/10 hover:text-chart-violet text-muted-foreground transition-colors"
                      title="Criar Campanha Especial"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-white">
        <span className="font-semibold text-white">Análise de Base: </span>
        {rows.length === 0
          ? `Nenhum cliente inativo no período ${periodoTxt}.`
          : `${rows.length} de ${totalClientes} clientes (${pctInativos.toFixed(1)}%) deixaram de transacionar em ao menos um mês. ${totalmenteInativos} ficaram totalmente inativos em ${periodoTxt}.`}
      </p>
    </div>
  );
}
