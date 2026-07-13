import { Loader2, Download, Search, Trash2, FileJson, FileSpreadsheet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/utils/exportCsv";
import { exportToJson } from "@/utils/exportJson";
import { AdminLayout } from "./AdminLayout";

interface Log {
  id: string; created_at: string; user_email: string | null; user_role: string | null;
  action: string; description: string | null; result: string;
  ip_address: string | null; user_agent: string | null; session_id: string | null;
}

async function fetchClientIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (!res.ok) return null;
    const data = (await res.json()) as { ip?: string };
    return data.ip ?? null;
  } catch {
    return null;
  }
}

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [q, setQ] = useState("");
  const [exportedBeforeClear, setExportedBeforeClear] = useState(false);
  const { role, user } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("audit_logs").select("*")
      .order("created_at", { ascending: false }).limit(500);
    setLogs((data as Log[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return logs.filter((l) =>
      !s || [l.user_email, l.action, l.description, l.result].some((v) => v?.toLowerCase().includes(s))
    );
  }, [logs, q]);

  const exportCsv = () => {
    exportToCsv(
      filtered.map((l) => [l.created_at, l.user_email ?? "", l.user_role ?? "", l.action, l.description ?? "", l.result, l.session_id ?? "", l.ip_address ?? "", l.user_agent ?? ""]),
      `auditoria-${Date.now()}.csv`,
      ["Data/Hora", "Usuário", "Perfil", "Ação", "Descrição", "Resultado", "Session ID", "IP", "User Agent"],
    );
    setExportedBeforeClear(true);
  };

  const exportJson = () => {
    exportToJson(filtered, `auditoria-${Date.now()}.json`);
    setExportedBeforeClear(true);
  };

  const clearLogs = async () => {
    setClearing(true);
    try {
      const totalBefore = logs.length;
      const clearedAt = new Date().toISOString();
      const clientIp = await fetchClientIp();

      const { error, count } = await supabase
        .from("audit_logs")
        .delete({ count: "exact" })
        .not("id", "is", null);
      if (error) throw error;

      await supabase.rpc("log_audit", {
        _action: "audit_logs_cleared",
        _description: `Logs de auditoria apagados (${count ?? 0} registros)`,
        _metadata: {
          admin_id: user?.id ?? null,
          admin_email: user?.email ?? null,
          ip_address: clientIp,
          user_agent: navigator.userAgent,
          cleared_at: clearedAt,
          records_deleted: count ?? 0,
          records_visible_before: totalBefore,
          exported_before_clear: exportedBeforeClear,
        },
      });
      toast({ title: "Logs apagados", description: `${count ?? 0} registros removidos.` });
      setExportedBeforeClear(false);
      await load();
    } catch (e) {
      toast({
        title: "Erro ao apagar logs",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <AdminLayout title="Auditoria">
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar por usuário, ação, descrição..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={exportCsv} variant="outline" className="gap-2"><FileSpreadsheet className="h-4 w-4" /> CSV</Button>
        <Button onClick={exportJson} variant="outline" className="gap-2"><FileJson className="h-4 w-4" /> JSON</Button>
        {isAdmin && (
          <AlertDialog onOpenChange={(open) => { if (!open) setExportedBeforeClear(false); }}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={clearing || logs.length === 0}>
                {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Limpar logs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar todos os logs de auditoria?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível. Todos os {logs.length} registros serão removidos permanentemente.
                  Recomendamos exportar antes um backup em CSV ou JSON.
                  Um novo registro será criado com seu ID de admin, IP e horário exato.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-2 my-2">
                <Button onClick={exportCsv} variant="outline" size="sm" className="gap-2 flex-1">
                  <Download className="h-4 w-4" /> Exportar CSV
                </Button>
                <Button onClick={exportJson} variant="outline" size="sm" className="gap-2 flex-1">
                  <Download className="h-4 w-4" /> Exportar JSON
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={exportedBeforeClear}
                  onCheckedChange={(v) => setExportedBeforeClear(v === true)}
                />
                Confirmo que exportei ou não preciso de backup dos logs.
              </label>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void clearLogs()}
                  disabled={!exportedBeforeClear}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, apagar tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="rounded-xl border border-border overflow-auto max-h-[70vh]">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="p-2 text-left">Data/Hora</th><th className="p-2 text-left">Usuário</th>
                <th className="p-2 text-left">Perfil</th><th className="p-2 text-left">Ação</th>
                <th className="p-2 text-left">Descrição</th><th className="p-2 text-left">Resultado</th>
                <th className="p-2 text-left">Session</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-2">{l.user_email ?? "—"}</td>
                  <td className="p-2">{l.user_role ?? "—"}</td>
                  <td className="p-2 font-mono">{l.action}</td>
                  <td className="p-2">{l.description}</td>
                  <td className="p-2">
                    <span className={l.result === "success" ? "text-success" : "text-destructive"}>{l.result}</span>
                  </td>
                  <td className="p-2 font-mono text-[10px] text-muted-foreground" title={l.session_id ?? ""}>
                    {l.session_id ? l.session_id.slice(0, 8) : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum registro</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
